import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
    const { table_id } = params;

    // 获取菜品列表
    const { data: dishes, error: dishesError } = await locals.supabase
        .from('dishes')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

    if (dishesError) {
        console.error('Error fetching dishes:', dishesError);
    }

    // 获取桌子信息和当前订单组
    const { data: table, error: tableError } = await locals.supabase
        .from('tables')
        .select('*')
        .eq('table_id', table_id)
        .single();

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
            .single();

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
