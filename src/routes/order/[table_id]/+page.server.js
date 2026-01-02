import { error, fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
    const { table_id } = params;
    console.log('=== [load] 开始加载数据 ===');
    console.log('[load] table_id:', table_id);

    // 获取菜品列表
    console.log('[load] 正在查询菜品...');
    const { data: dishes, error: dishesError } = await locals.supabase
        .from('dishes')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

    console.log('[load] 菜品查询结果:', { count: dishes?.length, error: dishesError });
    if (dishes && dishes.length > 0) {
        console.log('[load] 菜品样例:', dishes[0]);
    }

    if (dishesError) {
        console.error('Error fetching dishes:', dishesError);
    }

    // 获取桌子信息和当前订单组
    console.log('[load] 正在查询桌子信息...');
    const { data: table, error: tableError } = await locals.supabase
        .from('tables')
        .select('*')
        .eq('table_id', table_id)
        .maybeSingle();

    console.log('[load] 桌子查询结果:', { table, error: tableError });

    if (tableError) {
        console.error('Error fetching table:', tableError);
    }

    let orderGroup = null;
    let orders = [];

    if (table?.current_order_group_id) {
        // 获取订单组信息
        const { data: group, error: groupError } = await locals.supabase
            .from('order_groups')
            .select('*')
            .eq('id', table.current_order_group_id)
            .maybeSingle();

        if (groupError) {
            console.error('Error fetching group:', groupError);
        } else {
            orderGroup = group;

            // 获取该订单组下的所有子订单
            const { data: orderData, error: ordersError } = await locals.supabase
                .from('orders')
                .select('*')
                .eq('order_group_id', table.current_order_group_id)
                .order('sequence_number', { ascending: false });

            if (ordersError) {
                console.error('Error fetching orders:', ordersError);
            } else {
                orders = orderData || [];
            }
        }
    }

    // 计算总消费
    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.subtotal || 0), 0);

    // 获取分类列表（按 sort_order 排序）
    const { data: allCategories, error: categoriesError } = await locals.supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
    }

    // 只保留有菜品的分类
    const dishCategories = new Set(dishes?.map(d => d.category) || []);
    const categories = (allCategories || [])
        .map(c => c.name)
        .filter(name => dishCategories.has(name));

    console.log('[load] === 返回数据汇总 ===');
    console.log('[load] 菜品数量:', dishes?.length || 0);
    console.log('[load] 分类:', categories);
    console.log('[load] 订单数量:', orders.length);
    console.log('[load] 总消费:', totalSpent);

    return {
        table_id,
        table,
        orderGroup,
        orders,
        dishes: dishes || [],
        categories,
        totalSpent
    };
}

export const actions = {
    submitOrder: async ({ request, params, locals }) => {
        console.log('\n========== [submitOrder] 开始处理订单 ==========');
        const { table_id } = params;
        console.log('[submitOrder] table_id:', table_id);
        
        const formData = await request.formData();
        const cartItemsJson = formData.get('cartItems');
        console.log('[submitOrder] cartItemsJson:', cartItemsJson);
        
        if (!cartItemsJson || typeof cartItemsJson !== 'string') {
            console.log('[submitOrder] 错误: 购物车为空');
            return fail(400, { error: '购物车为空' });
        }

        /** @type {Array<{name: string, price: number, qty: number, options?: any[]}>} */
        let cartItems;
        try {
            cartItems = JSON.parse(cartItemsJson);
        } catch (e) {
            return fail(400, { error: '购物车数据无效' });
        }

        if (!cartItems || cartItems.length === 0) {
            return fail(400, { error: '购物车为空' });
        }

        // 计算小计
        const subtotal = cartItems.reduce((/** @type {number} */ sum, item) => sum + item.price * item.qty, 0);

        // 获取桌子信息
        console.log('[submitOrder] 正在查询桌子信息...');
        const { data: table, error: tableError } = await locals.supabase
            .from('tables')
            .select('*')
            .eq('table_id', table_id)
            .maybeSingle();

        console.log('[submitOrder] 桌子查询结果:', { table, error: tableError });

        if (tableError) {
            console.error('[submitOrder] 获取桌子失败:', tableError);
            return fail(500, { error: '获取桌台信息失败' });
        }

        let orderGroupId = table?.current_order_group_id;
        console.log('[submitOrder] 当前 orderGroupId:', orderGroupId);

        // 如果没有订单组，创建一个新的
        if (!orderGroupId) {
            console.log('[submitOrder] 没有订单组，创建新的...');
            const { data: newGroup, error: groupError } = await locals.supabase
                .from('order_groups')
                .insert({
                    table_id: table_id,
                    status: 'active',
                    total_amount: subtotal
                })
                .select()
                .single();

            console.log('[submitOrder] 创建订单组结果:', { newGroup, error: groupError });

            if (groupError) {
                console.error('[submitOrder] 创建订单组失败:', groupError);
                return fail(500, { error: '创建订单组失败' });
            }

            orderGroupId = newGroup.id;
            console.log('[submitOrder] 新的 orderGroupId:', orderGroupId);

            // 更新桌台的当前订单组
            console.log('[submitOrder] 更新桌台的 current_order_group_id...');
            const { data: updatedTable, error: updateTableError } = await locals.supabase
                .from('tables')
                .update({ current_order_group_id: orderGroupId })
                .eq('table_id', table_id)
                .select()
                .single();
            
            console.log('[submitOrder] 更新桌台结果:', { updatedTable, error: updateTableError });
            
            if (updateTableError) {
                console.error('[submitOrder] 更新桌台失败:', updateTableError);
                return fail(500, { error: '更新桌台状态失败' });
            }
        } else {
            // 更新订单组的总金额
            const { data: currentGroup } = await locals.supabase
                .from('order_groups')
                .select('total_amount')
                .eq('id', orderGroupId)
                .single();

            await locals.supabase
                .from('order_groups')
                .update({ total_amount: (parseFloat(currentGroup?.total_amount) || 0) + subtotal })
                .eq('id', orderGroupId);
        }

        // 获取下一个序号
        const { data: existingOrders } = await locals.supabase
            .from('orders')
            .select('sequence_number')
            .eq('order_group_id', orderGroupId)
            .order('sequence_number', { ascending: false })
            .limit(1);

        const nextSequence = (existingOrders?.[0]?.sequence_number || 0) + 1;

        // 创建订单
        console.log('[submitOrder] 正在创建订单...');
        console.log('[submitOrder] 订单数据:', {
            order_group_id: orderGroupId,
            items: cartItems,
            subtotal: subtotal,
            sequence_number: nextSequence,
            status: 'pending'
        });
        
        const { data: newOrder, error: orderError } = await locals.supabase
            .from('orders')
            .insert({
                order_group_id: orderGroupId,
                items: JSON.stringify(cartItems),
                subtotal: subtotal,
                sequence_number: nextSequence,
                status: 'pending'
            })
            .select()
            .single();

        console.log('[submitOrder] 创建订单结果:', { newOrder, error: orderError });

        if (orderError) {
            console.error('[submitOrder] 创建订单失败:', orderError);
            return fail(500, { error: '创建订单失败' });
        }

        console.log('========== [submitOrder] 订单创建成功 ==========');
        console.log('[submitOrder] 完整订单:', newOrder);
        console.log('================================================\n');

        return { success: true, order: newOrder };
    }
};
