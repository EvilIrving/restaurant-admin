import { error, fail } from '@sveltejs/kit';

export async function load({ locals }) {
    console.log('\n========== [admin/load] 开始加载后台数据 ==========');
    const supabase = locals.supabase;

    // 获取所有桌子
    const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('table_id', { ascending: true });

    console.log('[admin/load] 桌子数据:', tables);
    if (tablesError) {
        console.error('[admin/load] 获取桌子失败:', tablesError);
    }

    // 获取所有活跃订单组
    const { data: activeGroups, error: groupsError } = await supabase
        .from('order_groups')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    console.log('[admin/load] 活跃订单组:', activeGroups);
    if (groupsError) {
        console.error('[admin/load] 获取订单组失败:', groupsError);
    }

    // 获取所有订单
    const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    console.log('[admin/load] 所有订单:', allOrders);
    if (ordersError) {
        console.error('[admin/load] 获取订单失败:', ordersError);
    }

    // 获取所有菜品
    const { data: dishes, error: dishesError } = await supabase
        .from('dishes')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    console.log('[admin/load] 菜品数据:', dishes);
    if (dishesError) {
        console.error('[admin/load] 获取菜品失败:', dishesError);
    }

    // 获取所有分类
    const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    console.log('[admin/load] 分类数据:', categories);
    if (categoriesError) {
        console.error('[admin/load] 获取分类失败:', categoriesError);
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
        tableStatusMap,
        dishes: dishes || [],
        categories: categories || []
    };
}

export const actions = {
    // 桌台相关
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
    },

    // 菜品相关
    createDish: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const name = formData.get('name')?.toString().trim();
        const description = formData.get('description')?.toString() || '';
        const price = parseFloat(formData.get('price')?.toString() || '0');
        const originalPrice = formData.get('originalPrice') ? parseFloat(formData.get('originalPrice')?.toString() || '0') : null;
        const category = formData.get('category')?.toString().trim();
        const imageUrl = formData.get('imageUrl')?.toString().trim() || null;
        const optionsJson = formData.get('options')?.toString() || '{"specs":[]}';
        const isAvailable = formData.get('isAvailable') === 'true';
        const isRecommended = formData.get('isRecommended') === 'true';
        const sortOrder = parseInt(formData.get('sortOrder')?.toString() || '0');

        if (!name) return fail(400, { error: '请输入菜品名称' });
        if (!category) return fail(400, { error: '请选择菜品分类' });
        if (!price || price <= 0) return fail(400, { error: '请输入有效价格' });

        let options;
        try {
            options = JSON.parse(optionsJson);
        } catch (e) {
            options = { specs: [] };
        }

        const { error: insertError } = await supabase
            .from('dishes')
            .insert({
                name,
                description,
                price,
                original_price: originalPrice,
                category,
                image_url: imageUrl,
                options,
                is_available: isAvailable,
                is_recommended: isRecommended,
                sort_order: sortOrder
            });

        if (insertError) {
            console.error('[createDish] 创建菜品失败:', insertError);
            return fail(500, { error: '创建菜品失败' });
        }

        return { success: true };
    },

    updateDish: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const dishId = formData.get('dishId');
        const name = formData.get('name')?.toString().trim();
        const description = formData.get('description')?.toString() || '';
        const price = parseFloat(formData.get('price')?.toString() || '0');
        const originalPrice = formData.get('originalPrice') ? parseFloat(formData.get('originalPrice')?.toString() || '0') : null;
        const category = formData.get('category')?.toString().trim();
        const imageUrl = formData.get('imageUrl')?.toString().trim() || null;
        const optionsJson = formData.get('options')?.toString() || '{"specs":[]}';
        const isAvailable = formData.get('isAvailable') === 'true';
        const isRecommended = formData.get('isRecommended') === 'true';
        const sortOrder = parseInt(formData.get('sortOrder')?.toString() || '0');

        if (!dishId) return fail(400, { error: '无效的菜品ID' });
        if (!name) return fail(400, { error: '请输入菜品名称' });
        if (!category) return fail(400, { error: '请选择菜品分类' });
        if (!price || price <= 0) return fail(400, { error: '请输入有效价格' });

        let options;
        try {
            options = JSON.parse(optionsJson);
        } catch (e) {
            options = { specs: [] };
        }

        const { error: updateError } = await supabase
            .from('dishes')
            .update({
                name,
                description,
                price,
                original_price: originalPrice,
                category,
                image_url: imageUrl,
                options,
                is_available: isAvailable,
                is_recommended: isRecommended,
                sort_order: sortOrder,
                updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(dishId.toString()));

        if (updateError) {
            console.error('[updateDish] 更新菜品失败:', updateError);
            return fail(500, { error: '更新菜品失败' });
        }

        return { success: true };
    },

    deleteDish: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const dishId = formData.get('dishId');
        if (!dishId) return fail(400, { error: '无效的菜品ID' });

        const { error: deleteError } = await supabase
            .from('dishes')
            .delete()
            .eq('id', parseInt(dishId.toString()));

        if (deleteError) {
            console.error('[deleteDish] 删除菜品失败:', deleteError);
            return fail(500, { error: '删除菜品失败' });
        }

        return { success: true };
    },

    updateDishStatus: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const dishId = formData.get('dishId');
        const isAvailable = formData.get('isAvailable') === 'true';
        
        if (!dishId) return fail(400, { error: '无效的菜品ID' });

        const { error: updateError } = await supabase
            .from('dishes')
            .update({ is_available: isAvailable })
            .eq('id', parseInt(dishId.toString()));

        if (updateError) {
            return fail(500, { error: '更新状态失败' });
        }

        return { success: true };
    },

    batchUpdateStatus: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const dishIds = formData.get('dishIds')?.toString();
        const isAvailable = formData.get('isAvailable') === 'true';
        
        if (!dishIds) return fail(400, { error: '无效的菜品ID' });

        let ids;
        try {
            ids = JSON.parse(dishIds);
        } catch (e) {
            return fail(400, { error: '无效的ID列表' });
        }

        const { error: updateError } = await supabase
            .from('dishes')
            .update({ is_available: isAvailable })
            .in('id', ids);

        if (updateError) {
            return fail(500, { error: '批量更新失败' });
        }

        return { success: true, affected: ids.length };
    },

    batchDelete: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const dishIds = formData.get('dishIds')?.toString();
        
        if (!dishIds) return fail(400, { error: '无效的菜品ID' });

        let ids;
        try {
            ids = JSON.parse(dishIds);
        } catch (e) {
            return fail(400, { error: '无效的ID列表' });
        }

        const { error: deleteError } = await supabase
            .from('dishes')
            .delete()
            .in('id', ids);

        if (deleteError) {
            return fail(500, { error: '批量删除失败' });
        }

        return { success: true, affected: ids.length };
    },

    // 分类相关
    createCategory: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const name = formData.get('name')?.toString().trim();
        const icon = formData.get('icon')?.toString().trim() || '🍽️';

        if (!name) return fail(400, { error: '请输入分类名称' });

        // 获取当前最大排序值
        const { data: lastCat } = await supabase
            .from('categories')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        const sortOrder = (lastCat?.sort_order || 0) + 1;

        const { error: insertError } = await supabase
            .from('categories')
            .insert({ name, icon, sort_order: sortOrder });

        if (insertError) {
            console.error('[createCategory] 创建分类失败:', insertError);
            return fail(500, { error: '创建分类失败' });
        }

        return { success: true };
    },

    updateCategory: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const categoryId = formData.get('categoryId');
        const name = formData.get('name')?.toString().trim();
        const icon = formData.get('icon')?.toString().trim() || '🍽️';

        if (!categoryId) return fail(400, { error: '无效的分类ID' });
        if (!name) return fail(400, { error: '请输入分类名称' });

        const { error: updateError } = await supabase
            .from('categories')
            .update({ name, icon })
            .eq('id', parseInt(categoryId.toString()));

        if (updateError) {
            return fail(500, { error: '更新分类失败' });
        }

        return { success: true };
    },

    deleteCategory: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const categoryId = formData.get('categoryId');
        if (!categoryId) return fail(400, { error: '无效的分类ID' });

        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', parseInt(categoryId.toString()));

        if (deleteError) {
            return fail(500, { error: '删除分类失败' });
        }

        return { success: true };
    },

    moveCategory: async ({ request, locals }) => {
        const formData = await request.formData();
        const supabase = locals.supabase;
        
        const categoryId = parseInt(formData.get('categoryId')?.toString() || '0');
        const direction = formData.get('direction')?.toString();

        if (!categoryId) return fail(400, { error: '无效的分类ID' });

        // 获取所有分类
        const { data: categories, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (fetchError) return fail(500, { error: '获取分类失败' });

        const currentIndex = categories.findIndex(c => c.id === categoryId);
        if (currentIndex < 0) return fail(400, { error: '分类不存在' });

        let targetIndex;
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < categories.length - 1) {
            targetIndex = currentIndex + 1;
        } else {
            return { success: true }; // 无需移动
        }

        // 交换排序值
        const currentCat = categories[currentIndex];
        const targetCat = categories[targetIndex];

        const { error: updateError1 } = await supabase
            .from('categories')
            .update({ sort_order: targetCat.sort_order })
            .eq('id', currentCat.id);

        const { error: updateError2 } = await supabase
            .from('categories')
            .update({ sort_order: currentCat.sort_order })
            .eq('id', targetCat.id);

        if (updateError1 || updateError2) {
            return fail(500, { error: '移动分类失败' });
        }

        return { success: true };
    },

    // 删除桌子
    deleteTable: async ({ request, locals }) => {
        const formData = await request.formData();
        const tableId = formData.get('tableId');
        const supabase = locals.supabase;
        
        if (!tableId) return fail(400, { error: '无效的桌号' });

        // 检查桌子是否有活跃订单
        const { data: table } = await supabase
            .from('tables')
            .select('current_order_group_id')
            .eq('table_id', tableId)
            .single();

        if (table?.current_order_group_id) {
            return fail(400, { error: '该桌有活跃订单，无法删除' });
        }

        const { error: deleteError } = await supabase
            .from('tables')
            .delete()
            .eq('table_id', tableId);

        if (deleteError) return fail(500, { error: '删除桌台失败' });

        return { success: true };
    },

    // 更新订单状态
    updateOrderStatus: async ({ request, locals }) => {
        const formData = await request.formData();
        const orderId = formData.get('orderId');
        const status = formData.get('status');
        const supabase = locals.supabase;
        
        if (!orderId || !status) return fail(400, { error: '参数无效' });

        const validStatuses = ['pending', 'cooking', 'done'];
        if (!validStatuses.includes(status)) {
            return fail(400, { error: '无效的订单状态' });
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', parseInt(orderId.toString()));

        if (updateError) return fail(500, { error: '更新订单状态失败' });

        return { success: true };
    }
};
