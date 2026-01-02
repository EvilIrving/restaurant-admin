<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { ChefHat, LogOut, Plus, Clock, Utensils, LayoutGrid, TrendingUp, Search, Edit, QrCode } from 'lucide-svelte';
    import { supabase } from '$lib/supabaseClient.js';
    import { onMount } from 'svelte';
    import DishFormModal from '$lib/components/admin/DishFormModal.svelte';
    import CategoryManager from '$lib/components/admin/CategoryManager.svelte';
    import { generateStyledQRCode, downloadQRCodeImage } from '$lib/qrcode.js';

    let { data } = $props();
    
    // Tab 状态: 'tables' | 'dishes'
    let activeTab = $state('tables');
    
    // 桌台相关状态
    let selectedTable = $state(null);
    let newTableId = $state('');
    
    // 二维码相关状态
    let showQRModal = $state(false);
    let selectedQRTableId = $state('');
    let qrCodeUrl = $state('');
    let isGeneratingQR = $state(false);
    
    // 菜品相关状态
    let searchKeyword = $state('');
    let selectedCategory = $state('');

    let selectedDishes = $state([]);
    let editingDish = $state(null);
    let showDishModal = $state(false);
    let showCategoryModal = $state(false);
    let isBatchMode = $state(false);

    // 分类列表
    let categories = $derived(data.categories || []);
    
    // 筛选后的菜品列表
    let filteredDishes = $derived(data.dishes.filter(dish => {
        // 搜索筛选
        if (searchKeyword && !dish.name.includes(searchKeyword)) return false;
        // 分类筛选
        if (selectedCategory && dish.category !== selectedCategory) return false;
        return true;
    }));

    // 实时订阅
    onMount(() => {
        const channels = [
            supabase.channel('admin-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => invalidateAll()).subscribe(),
            supabase.channel('admin-tables').on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => invalidateAll()).subscribe(),
            supabase.channel('admin-groups').on('postgres_changes', { event: '*', schema: 'public', table: 'order_groups' }, () => invalidateAll()).subscribe(),
            supabase.channel('admin-dishes').on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, () => invalidateAll()).subscribe(),
            supabase.channel('admin-categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => invalidateAll()).subscribe(),
        ];

        return () => channels.forEach(c => supabase.removeChannel(c));
    });

    // 工具函数
    function getTableStatus(tableId) {
        return data.tableStatusMap[tableId] || null;
    }

    function formatTime(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    function getTimeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const minutes = Math.floor((now - date) / 60000);
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        return `${hours}小时前`;
    }

    // 桌台操作
    function createTable() {
        if (!newTableId.trim()) return;
        return async ({ result, update }) => {
            if (result.type === 'success') newTableId = '';
            await update();
        };
    }

    function settleTable() {
        if (!selectedTable || !confirm(`确认结束桌号 ${selectedTable} 的用餐吗？这将释放桌位。`)) return;
        return async ({ result, update }) => {
            if (result.type === 'success') selectedTable = null;
            await update();
        };
    }

    // 二维码相关函数
    async function showQRCode(tableId) {
        selectedQRTableId = tableId;
        showQRModal = true;
        isGeneratingQR = true;
        
        // 使用固定的正式域名
        const baseUrl = 'https://restaurant.onecat.dev';
        qrCodeUrl = await generateStyledQRCode(tableId, baseUrl);
        
        isGeneratingQR = false;
    }

    function closeQRModal() {
        showQRModal = false;
        selectedQRTableId = '';
        qrCodeUrl = '';
    }

    async function downloadQRCode() {
        await downloadQRCodeImage(qrCodeUrl, `table-${selectedQRTableId}-qrcode.png`);
    }




    // 菜品操作
    function openAddDish() {
        editingDish = null;
        showDishModal = true;
    }

    function openEditDish(dish) {
        editingDish = dish;
        showDishModal = true;
    }

    function handleDishSave(event) {
        showDishModal = false;
        editingDish = null;
        invalidateAll();
    }



    function deleteDish(dish) {
        return ({ cancel }) => {
            if (!confirm(`确定删除菜品 "${dish.name}" 吗？`)) {
                cancel();
                return;
            }
            return async ({ result, update }) => {
                if (result.type === 'success') invalidateAll();
                await update();
            };
        };
    }

    function moveDish(dish, direction) {
        // 简单的排序移动，通过 update 触发
        return async ({ update }) => {
            await update();
        };
    }

    // 批量操作
    function toggleBatchMode() {
        isBatchMode = !isBatchMode;
        selectedDishes = [];
    }

    function toggleDishSelection(dishId) {
        if (selectedDishes.includes(dishId)) {
            selectedDishes = selectedDishes.filter(id => id !== dishId);
        } else {
            selectedDishes = [...selectedDishes, dishId];
        }
    }

    function selectAllDishes() {
        if (selectedDishes.length === filteredDishes.length) {
            selectedDishes = [];
        } else {
            selectedDishes = filteredDishes.map(d => d.id);
        }
    }



    function batchDelete() {
        if (!confirm(`确定删除选中的 ${selectedDishes.length} 道菜品吗？此操作不可恢复！`)) return;
        return async ({ update }) => {
            await update();
            selectedDishes = [];
        };
    }

    function openCategoryManager() {
        showCategoryModal = true;
    }
</script>

<svelte:head>
    <title>餐厅管理端</title>
</svelte:head>

<div class="flex flex-col h-screen bg-slate-100">
    <!-- Header -->
    <header class="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 class="font-bold text-lg flex items-center gap-2">
            <ChefHat size={20} /> 餐厅管理端
        </h1>
        <a href="/" class="text-slate-400 hover:text-white">
            <LogOut size={18} />
        </a>
    </header>

    <!-- Tab 导航 -->
    <div class="bg-white border-b border-slate-200 px-4">
        <div class="flex gap-1">
            <button 
                onclick={() => activeTab = 'tables'}
                class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'tables' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}"
            >
                <span class="flex items-center gap-2">
                    <LayoutGrid size={16} />
                    桌台管理
                </span>
            </button>
            <button 
                onclick={() => activeTab = 'dishes'}
                class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'dishes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}"
            >
                <span class="flex items-center gap-2">
                    <Utensils size={16} />
                    菜品管理
                </span>
            </button>
        </div>
    </div>

    <!-- 主体内容 -->
    <div class="flex-1 overflow-y-auto p-4">
        {#if activeTab === 'tables'}
            <!-- 桌台管理 Tab -->
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">桌台状态</h2>
            
            <form method="POST" action="?/createTable" use:enhance={createTable} class="mb-4">
                <div class="flex gap-2">
                    <input 
                        type="text" 
                        name="tableId" 
                        bind:value={newTableId}
                        placeholder="输入新桌号（如 A03）"
                        class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button type="submit" class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
                        <Plus size={18} /> 添加
                    </button>
                </div>
            </form>

            <div class="grid grid-cols-2 gap-4">
                {#each data.tables as table}
                    {@const status = getTableStatus(table.table_id)}
                    <div 
                        onclick={() => selectedTable = table.table_id}
                        onkeydown={(e) => e.key === 'Enter' && (selectedTable = table.table_id)}
                        role="button"
                        tabindex="0"
                        class="p-5 rounded-xl border-2 transition-all text-left cursor-pointer {status ? 'bg-white border-orange-500 shadow-md' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}"
                    >
                        <div class="flex justify-between items-start mb-3">
                            <span class="text-4xl font-black text-slate-800">{table.table_id}</span>
                            <div class="flex items-center gap-1">
                                <button 
                                    onclick={(e) => { e.stopPropagation(); showQRCode(table.table_id); }}
                                    class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                    title="二维码"
                                >
                                    <QrCode size={22} />
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 mb-3">
                            {#if status}
                                <span class="text-sm px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-bold">用餐中</span>
                            {:else}
                                <span class="text-sm px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full">空闲</span>
                            {/if}
                        </div>
                        
                        {#if status}
                            <div class="space-y-2">
                                <p class="text-base text-slate-500">当前消费</p>
                                <p class="text-3xl font-black text-orange-600">¥{status.total}</p>
                                <p class="text-base text-orange-500 mt-3 flex items-center gap-1.5">
                                    <Clock size={18} /> 
                                    {getTimeAgo(status.group.created_at)}开台
                                </p>
                            </div>
                        {:else}
                            <div class="h-20 flex items-center justify-center text-slate-300">
                                <span class="text-lg">空闲中</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

        {:else}
            <!-- 菜品管理 Tab -->
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider">菜品列表</h2>
                <div class="flex gap-2">
                    <button 
                        onclick={openCategoryManager}
                        class="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm flex items-center gap-1"
                    >
                        <LayoutGrid size={16} /> 分类管理
                    </button>
                    <button 
                        onclick={openAddDish}
                        class="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm flex items-center gap-1"
                    >
                        <Plus size={16} /> 新增菜品
                    </button>
                </div>
            </div>

            <!-- 搜索和筛选 -->
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 space-y-3">
                <div class="flex gap-2">
                    <div class="relative flex-1">
                        <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            bind:value={searchKeyword}
                            placeholder="搜索菜品名称..."
                            class="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <select 
                        bind:value={selectedCategory}
                        class="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    >
                        <option value="">全部分类</option>
                        {#each categories as cat}
                            <option value={cat.name}>{cat.icon} {cat.name}</option>
                        {/each}
                    </select>

                </div>
                
                <!-- 批量操作栏 -->
                <div class="flex justify-between items-center pt-2 border-t border-slate-100">
                    <button 
                        onclick={toggleBatchMode}
                        class="text-sm {isBatchMode ? 'text-orange-600' : 'text-slate-500'} hover:text-orange-600"
                    >
                        {isBatchMode ? '取消选择' : '批量操作'}
                    </button>
                    {#if isBatchMode}
                        <div class="flex gap-2">
                            <span class="text-sm text-slate-500 py-1">已选择 {selectedDishes.length} 项</span>
                            <button 
                                onclick={selectAllDishes}
                                class="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200"
                            >
                                {selectedDishes.length === filteredDishes.length ? '取消全选' : '全选'}
                            </button>
                            {#if selectedDishes.length > 0}
                                <form method="POST" action="?/batchDelete" use:enhance={batchDelete}>
                                    <input type="hidden" name="dishIds" value={JSON.stringify(selectedDishes)} />
                                    <button type="submit" class="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                                        批量删除
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 菜品列表 -->
            <div class="space-y-3">
                {#each filteredDishes as dish (dish.id)}
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 {isBatchMode ? 'cursor-pointer' : ''}" 
                         onclick={() => isBatchMode && toggleDishSelection(dish.id)}>
                        {#if isBatchMode}
                            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 {selectedDishes.includes(dish.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}">
                                {#if selectedDishes.includes(dish.id)}
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                {/if}
                            </div>
                        {/if}
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-xl font-bold text-slate-800 truncate">{dish.name}</h3>
                                {#if dish.is_recommended}
                                    <span class="text-sm px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full shrink-0">推荐</span>
                                {/if}
                            </div>
                            <p class="text-base text-slate-500 truncate">{dish.category}</p>
                            <p class="text-2xl font-black text-orange-600">¥{dish.price}</p>
                        </div>
                        
                        <div class="flex items-center gap-1 shrink-0">
                            <button 
                                onclick={() => openEditDish(dish)}
                                class="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                title="编辑"
                            >
                                <Edit size={22} />
                            </button>
                            
                            <!-- <form method="POST" action="?/deleteDish" use:enhance={deleteDish(dish)}>
                                <input type="hidden" name="dishId" value={dish.id} />
                                <button 
                                    type="submit"
                                    class="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                                    title="删除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </form> -->
                        </div>
                    </div>
                {/each}
                
                {#if filteredDishes.length === 0}
                    <div class="text-center py-12 text-slate-400">
                        <Utensils size={48} class="mx-auto mb-4 opacity-50" />
                        <p>暂无菜品</p>
                        <button onclick={openAddDish} class="text-orange-500 hover:text-orange-600 mt-2">
                            点击添加第一个菜品
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<!-- 桌台详情模态框 -->
{#if selectedTable}
    {@const status = getTableStatus(selectedTable)}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
            <header class="bg-orange-500 text-white p-4 flex items-center justify-between">
                <div>
                    <h2 class="font-bold text-2xl">桌号 {selectedTable}</h2>
                    <p class="text-orange-100 text-sm">{status ? '用餐中' : '空闲'}</p>
                </div>
                <button onclick={() => selectedTable = null} class="text-orange-100 hover:text-white text-base font-medium">
                    关闭
                </button>
            </header>

            <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {#if status}
                    <div class="space-y-4">
                        {#each status.orders as order}
                            {@const items = JSON.parse(order.items || '[]')}
                            <div class="bg-white rounded-xl shadow-md border-2 border-orange-400 overflow-hidden">
                                <div class="p-3 border-b border-slate-100 bg-orange-50">
                                    <span class="text-xl font-bold text-slate-800">第 {order.sequence_number} 单</span>
                                </div>
                                <div class="p-4 space-y-3">
                                    {#each items as item}
                                        <div class="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
                                            <span class="w-12 h-12 bg-orange-500 text-white rounded-lg flex items-center justify-center text-2xl font-bold shrink-0">{item.qty}</span>
                                            <span class="text-2xl font-bold text-slate-800 flex-1">{item.name}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>

                    <div class="bg-white p-4 rounded-xl shadow-sm text-center">
                        <p class="text-slate-500 text-base">消费总计</p>
                        <p class="text-3xl font-bold text-orange-600">¥{status.total}</p>
                    </div>
                {:else}
                    <div class="text-center py-20 text-slate-400">
                        <Clock size={48} class="mx-auto mb-4 opacity-50" />
                        <p class="text-xl">该桌当前没有活跃订单</p>
                    </div>
                {/if}
            </div>

            <footer class="bg-white p-4 border-t border-slate-200">
                {#if status}
                    <form method="POST" action="?/settleTable" use:enhance={settleTable}>
                        <input type="hidden" name="tableId" value={selectedTable} />
                        <button type="submit" class="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg">
                            结束订单 / 释放桌位
                        </button>
                    </form>
                {:else}
                    <button class="w-full py-4 bg-slate-100 text-slate-400 rounded-lg font-bold text-lg cursor-not-allowed" disabled>
                        空闲桌位
                    </button>
                {/if}
            </footer>
        </div>
    </div>
{/if}

<!-- 菜品新增/编辑弹窗 -->
{#if showDishModal}
    <DishFormModal 
        dish={editingDish}
        categories={categories}
        onSave={handleDishSave}
        onClose={() => { showDishModal = false; editingDish = null; }}
    />
{/if}

<!-- 分类管理弹窗 -->
{#if showCategoryModal}
    <CategoryManager 
        categories={categories}
        onClose={() => showCategoryModal = false}
        onSave={() => { showCategoryModal = false; invalidateAll(); }}
    />
{/if}

<!-- 二维码模态框 -->
{#if showQRModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onclick={closeQRModal}>
        <div class="bg-white rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl" onclick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-bold text-slate-800 mb-4">桌号 {selectedQRTableId} 二维码</h3>
            
            <!-- 二维码预览 -->
            {#if isGeneratingQR}
                <div class="w-64 h-80 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                    <div class="text-slate-400 flex flex-col items-center gap-2">
                        <div class="w-6 h-6 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin"></div>
                        <span>生成中...</span>
                    </div>
                </div>
            {:else if qrCodeUrl}
                <div class="mb-4">
                    <img src={qrCodeUrl} alt="桌号 {selectedQRTableId} 二维码" class="w-64 mx-auto rounded-lg shadow-md" />
                </div>
            {/if}
            
            <!-- 操作按钮 -->
            <div class="space-y-2">
                <button 
                    onclick={downloadQRCode}
                    disabled={isGeneratingQR}
                    class="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    下载二维码
                </button>
                <button 
                    onclick={closeQRModal}
                    class="w-full py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                    关闭
                </button>
            </div>
        </div>
    </div>
{/if}
