import { error, fail } from '@sveltejs/kit';

export async function load({ locals }) {
    const supabase = locals.supabase;

    // 获取所有桌子
    const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('table_id', { ascending: true });

    if (tablesError) {
        console.error('Error fetching tables:', tablesError);
    }

    // 获取所有活跃订单组
    const { data: activeGroups, error: groupsError } = await supabase
        .from('order_groups')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (groupsError) {
        console.error('Error fetching groups:', groupsError);
    }

    // 获取所有订单
    const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
    }

    // 构建桌子状态映射
    const tableStatusMap = {};
    
    if (tables && activeGroups) {
        for (const table of tables) {
            if (table.current_order_group_id) {
                const group = activeGroups.find(g => g.id === table.current_order_group_id);
                if (group) {
                    const tableOrders = allOrders?.filter(o => o.order_group_id === group.id) || [];
                    const total = tableOrders.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);
                    tableStatusMap[table.table_id] = {
                        group,
                        orders: tableOrders,
                        total
                    };
                }
            }
        }
    }

    return {
        tables: tables || [],
        tableStatusMap
    };
}

export const actions = {
    createTable: async ({ request, locals }) => {
        const formData = await request.formData();
        const tableId = formData.get('tableId');
        const supabase = locals.supabase;
        
        if (!tableId || typeof tableId !== 'string') {
            return fail(400, { error: '请输入有效的桌号' });
        }

        // 检查桌号是否已存在
        const { data: existing } = await supabase
            .from('tables')
            .select('table_id')
            .eq('table_id', tableId)
            .single();

        if (existing) {
            return fail(400, { error: '桌号已存在' });
        }

        const { error: insertError } = await supabase
            .from('tables')
            .insert({ table_id: tableId });

        if (insertError) {
            return fail(500, { error: '创建桌台失败' });
        }

        return { success: true };
    },

    settleTable: async ({ request, locals }) => {
        const formData = await request.formData();
        const tableId = formData.get('tableId');
        const supabase = locals.supabase;
        
        if (!tableId) {
            return fail(400, { error: '无效的桌号' });
        }

        // 获取桌子的当前订单组
        const { data: table, error: tableError } = await supabase
            .from('tables')
            .select('current_order_group_id')
            .eq('table_id', tableId)
            .single();

        if (tableError || !table?.current_order_group_id) {
            return fail(400, { error: '该桌没有活跃订单' });
        }

        // 更新订单组状态为已完成
        const { error: groupError } = await supabase
            .from('order_groups')
            .update({ status: 'completed' })
            .eq('id', table.current_order_group_id);

        if (groupError) {
            return fail(500, { error: '结束订单失败' });
        }

        // 释放桌位
        const { error: updateError } = await supabase
            .from('tables')
            .update({ current_order_group_id: null })
            .eq('table_id', tableId);

        if (updateError) {
            return fail(500, { error: '释放桌位失败' });
        }

        return { success: true };
    }
};