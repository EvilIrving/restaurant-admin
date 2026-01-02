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

    // 获取分类列表
    const categories = [...new Set(dishes?.map(d => d.category) || [])];

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
        const { table_id } = params;
        const formData = await request.formData();
        const cartItemsJson = formData.get('cartItems');
        
        if (!cartItemsJson || typeof cartItemsJson !== 'string') {
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
        const { data: table, error: tableError } = await locals.supabase
            .from('tables')
            .select('*')
            .eq('table_id', table_id)
            .maybeSingle();

        if (tableError) {
            console.error('Error fetching table:', tableError);
            return fail(500, { error: '获取桌台信息失败' });
        }

        let orderGroupId = table?.current_order_group_id;

        // 如果没有订单组，创建一个新的
        if (!orderGroupId) {
            const { data: newGroup, error: groupError } = await locals.supabase
                .from('order_groups')
                .insert({
                    table_id: table_id,
                    status: 'active',
                    total_amount: subtotal
                })
                .select()
                .single();

            if (groupError) {
                console.error('Error creating order group:', groupError);
                return fail(500, { error: '创建订单组失败' });
            }

            orderGroupId = newGroup.id;

            // 更新桌台的当前订单组
            await locals.supabase
                .from('tables')
                .update({ current_order_group_id: orderGroupId, status: 'occupied' })
                .eq('table_id', table_id);
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
        const { data: newOrder, error: orderError } = await locals.supabase
            .from('orders')
            .insert({
                order_group_id: orderGroupId,
                table_id: table_id,
                items: JSON.stringify(cartItems),
                subtotal: subtotal,
                sequence_number: nextSequence,
                status: 'pending'
            })
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return fail(500, { error: '创建订单失败' });
        }

        console.log('[submitOrder] 订单创建成功:', newOrder);

        return { success: true, order: newOrder };
    }
};
