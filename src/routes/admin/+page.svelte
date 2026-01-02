<script>
    import { enhance } from '$app/forms';
    import { ChefHat, LogOut, Plus, Clock } from 'lucide-svelte';

    let { data } = $props();
    let selectedTable = $state(null);
    let newTableId = $state('');

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

    function createTable() {
        if (!newTableId.trim()) return;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                newTableId = '';
            }
            await update();
        };
    }

    function settleTable() {
        if (!selectedTable || !confirm(`确认结束桌号 ${selectedTable} 的用餐吗？这将释放桌位。`)) return;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                selectedTable = null;
            }
            await update();
        };
    }
</script>

<svelte:head>
    <title>餐厅管理端</title>
</svelte:head>

<div class="flex flex-col h-screen bg-slate-100">
    <header class="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 class="font-bold text-lg flex items-center gap-2">
            <ChefHat size={20} /> 餐厅管理端
        </h1>
        <a href="/" class="text-slate-400 hover:text-white">
            <LogOut size={18} />
        </a>
    </header>

    <div class="flex-1 p-4 overflow-y-auto">
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
                <button 
                    onclick={() => selectedTable = table.table_id}
                    class="p-4 rounded-xl border-2 transition-all text-left {status ? 'bg-white border-orange-500 shadow-md' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}"
                >
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-2xl font-bold text-slate-800">{table.table_id}</span>
                        {#if status}
                            <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">用餐中</span>
                        {:else}
                            <span class="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">空闲</span>
                        {/if}
                    </div>
                    
                    {#if status}
                        <div class="space-y-1">
                            <p class="text-xs text-slate-500">当前消费</p>
                            <p class="text-lg font-bold text-orange-600">¥{status.total}</p>
                            <p class="text-xs text-orange-400 mt-2 flex items-center gap-1">
                                <Clock size={12} /> 
                                {getTimeAgo(status.group.created_at)}开台
                            </p>
                        </div>
                    {:else}
                        <div class="h-16 flex items-center justify-center text-slate-300">
                            <span class="text-sm">空闲中</span>
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>
</div>

<!-- 桌子详情模态框 -->
{#if selectedTable}
    {@const status = getTableStatus(selectedTable)}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <header class="bg-white p-4 shadow-sm flex items-center gap-3 border-b">
                <button onclick={() => selectedTable = null} class="p-2 hover:bg-slate-100 rounded-full" aria-label="关闭模态框">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <div>
                    <h2 class="font-bold text-lg">桌号 {selectedTable} 详情</h2>
                    <p class="text-xs text-slate-500">状态: {status ? '用餐中' : '空闲'}</p>
                </div>
            </header>

            <div class="flex-1 overflow-y-auto p-4 space-y-6">
                {#if status}
                    <div class="bg-white p-6 rounded-xl shadow-sm text-center">
                        <p class="text-slate-500 text-sm mb-1">当前消费总计</p>
                        <p class="text-4xl font-bold text-slate-800">¥{status.total}</p>
                        <p class="text-xs text-slate-400 mt-2">共 {status.orders.length} 次下单</p>
                    </div>

                    <div class="space-y-4">
                        {#each status.orders as order}
                            {@const items = JSON.parse(order.items || '[]')}
                            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div class="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                                    <span class="font-bold text-slate-700">第 {order.sequence_number} 次下单</span>
                                    <span class="text-xs text-slate-400">{formatTime(order.created_at)}</span>
                                </div>
                                <div class="p-3 space-y-2">
                                    {#each items as item}
                                        <div class="flex justify-between text-sm">
                                            <span class="flex items-center gap-2">
                                                <span class="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-600">{item.qty}</span>
                                                {item.name}
                                            </span>
                                            <span class="text-slate-600">¥{item.price * item.qty}</span>
                                        </div>
                                    {/each}
                                    <div class="pt-2 mt-2 border-t border-dashed border-slate-200 flex justify-end">
                                        <span class="text-sm font-bold">小计: ¥{order.subtotal}</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="text-center py-20 text-slate-400">
                        <Clock size={48} class="mx-auto mb-4 opacity-50" />
                        <p>该桌当前没有活跃订单</p>
                    </div>
                {/if}
            </div>

            <footer class="bg-white p-4 border-t border-slate-200">
                {#if status}
                    <form method="POST" action="?/settleTable" use:enhance={settleTable}>
                        <input type="hidden" name="tableId" value={selectedTable} />
                        <button type="submit" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium">
                            结束订单 / 释放桌位
                        </button>
                    </form>
                {:else}
                    <button class="w-full py-3 bg-slate-100 text-slate-400 rounded-lg font-medium cursor-not-allowed" disabled>
                        空闲桌位
                    </button>
                {/if}
            </footer>
        </div>
    </div>
{/if}
