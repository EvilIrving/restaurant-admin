import { fail, redirect } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const formData = await request.formData();
    const cartItems = JSON.parse(formData.get('cartItems') || '[]');
    const tableId = formData.get('tableId');

    if (cartItems.length === 0) {
        return fail(400, { error: '购物车为空' });
    }

    const supabase = locals.supabase;

    try {
        // 获取桌子信息
        const { data: table, error: tableError } = await supabase
            .from('tables')
            .select('*')
            .eq('table_id', tableId)
            .single();

        if (tableError) {
            throw new Error('获取桌子信息失败');
        }

        let orderGroupId;
        let sequenceNumber = 1;

        if (table.current_order_group_id) {
            // 已有活跃订单组，加单
            orderGroupId = table.current_order_group_id;

            // 获取最新下单次数
            const { data: latestOrder } = await supabase
                .from('orders')
                .select('sequence_number')
                .eq('order_group_id', orderGroupId)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .single();

            if (latestOrder) {
                sequenceNumber = latestOrder.sequence_number + 1;
            }
        } else {
            // 创建新订单组
            const { data: newGroup, error: groupError } = await supabase
                .from('order_groups')
                .insert({
                    table_id: tableId,
                    status: 'active',
                    total_amount: 0
                })
                .select()
                .single();

            if (groupError) {
                throw new Error('创建订单组失败');
            }

            orderGroupId = newGroup.id;

            // 更新桌子的当前订单组
            const { error: updateError } = await supabase
                .from('tables')
                .update({ current_order_group_id: orderGroupId })
                .eq('table_id', tableId);

            if (updateError) {
                throw new Error('更新桌子状态失败');
            }
        }

        // 计算小计
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

        // 创建子订单
        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                order_group_id: orderGroupId,
                items: cartItems,
                subtotal: subtotal,
                sequence_number: sequenceNumber,
                status: 'pending'
            });

        if (orderError) {
            throw new Error('创建订单失败');
        }

        return { success: true, message: `下单成功！这是第 ${sequenceNumber} 次下单。` };
    } catch (error) {
        console.error('下单错误:', error);
        return fail(500, { error: error.message || '下单失败，请重试' });
    }
}
