<script>
    import { enhance } from '$app/forms';
    import { ShoppingCart, LogOut } from 'lucide-svelte';
    import { cart } from '$lib/stores/cart.svelte.js';

    let { data } = $props();
    let selectedCategory = $derived(data.categories[0] || '热菜');
    let currentCategory = $state(null);
    let isSubmitting = $state(false);
    let showOptionsModal = $state(false);
    let selectedDish = $state(null);
    let selectedOptions = $state([]);

    let activeCategory = $derived(currentCategory ?? selectedCategory);
    let filteredDishes = $derived(data.dishes.filter(d => d.category === activeCategory));

    function openOptionsModal(dish) {
        selectedDish = dish;
        const options = Array.isArray(dish.options) ? dish.options : [];
        selectedOptions = options.length > 0 ? [options[0]] : [];
        showOptionsModal = true;
    }

    function addToCart() {
        if (selectedDish) {
            cart.addItem(selectedDish, selectedOptions);
            showOptionsModal = false;
            selectedDish = null;
            selectedOptions = [];
        }
    }

    function submitOrder() {
        if (cart.items.length === 0) return;
        isSubmitting = true;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                cart.clear();
            }
            await update();
            isSubmitting = false;
        };
    }

    function closeModal() {
        showOptionsModal = false;
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    }
</script>

<svelte:head>
    <title>点餐 - 桌号 {data.table_id}</title>
</svelte:head>

<div class="flex flex-col h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
    <!-- Header -->
    <header class="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
        <div class="flex items-center gap-2">
            <div class="bg-slate-900 text-white px-3 py-1 rounded text-sm font-bold">
                桌号 {data.table_id}
            </div>
            {#if data.orderGroup}
                <span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    用餐中
                </span>
            {/if}
        </div>
        <a href="/" class="text-slate-400 hover:text-slate-600">
            <LogOut size={18} />
        </a>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
        <!-- Categories -->
        <div class="flex overflow-x-auto bg-white border-b border-slate-100 no-scrollbar">
            {#each data.categories as cat}
                <button 
                    onclick={() => currentCategory = cat}
                    class="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors {activeCategory === cat ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'}"
                >
                    {cat}
                </button>
            {/each}
        </div>

        <!-- Dishes -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            <!-- 已下单信息 -->
            {#if data.orders.length > 0}
                <div class="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
                    <div class="flex justify-between items-center text-xs text-orange-800 mb-1">
                        <span class="font-bold">已下单 {data.orders.length} 次</span>
                        <span>共消费 ¥{data.totalSpent}</span>
                    </div>
                    <div class="text-xs text-orange-600 truncate">
                        最近: {JSON.parse(data.orders[0]?.items || '[]').map(i => i.name).join(', ')}
                    </div>
                </div>
            {/if}

            {#each filteredDishes as dish (dish.id)}
                <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                    <div class="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                        {#if dish.image_url}
                            <img src={dish.image_url} alt={dish.name} class="w-full h-full object-cover" />
                        {:else}
                            <span>🍽️</span>
                        {/if}
                    </div>
                    <div class="flex-1 flex flex-col justify-between">
                        <div>
                            <h3 class="font-bold text-slate-800">{dish.name}</h3>
                            {#if dish.options}
                                {@const opts = Array.isArray(dish.options) ? dish.options : []}
                                {#if opts.length > 0}
                                    <p class="text-xs text-slate-400 mt-1">
                                        {opts.map(o => o.name).join('/')}
                                    </p>
                                {/if}
                            {/if}
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-orange-600 font-bold">¥{dish.price}</span>
                            <button 
                                onclick={() => openOptionsModal(dish)}
                                class="bg-orange-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-orange-600 transition-colors"
                            >
                                + 选购
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- Cart & Action Bar -->
    <div class="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg pb-8">
        {#if cart.items.length > 0}
            <div class="space-y-3">
                <div class="max-h-32 overflow-y-auto space-y-2 mb-2">
                    {#each cart.items as item, idx}
                        <div class="flex justify-between text-sm">
                            <span class="text-slate-700">{item.name} x{item.qty}</span>
                            <span class="font-medium">¥{item.price * item.qty}</span>
                        </div>
                    {/each}
                </div>
                <div class="flex justify-between items-center border-t pt-3">
                    <div>
                        <p class="text-xs text-slate-500">待提交金额</p>
                        <p class="text-xl font-bold text-orange-600">¥{cart.total}</p>
                    </div>
                    <form method="POST" action="?/submitOrder" use:enhance={submitOrder}>
                        <input type="hidden" name="cartItems" value={JSON.stringify(cart.items)} />
                        <input type="hidden" name="tableId" value={data.table_id} />
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            class="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '提交中...' : (data.orderGroup ? '加菜下单' : '提交订单')}
                        </button>
                    </form>
                </div>
            </div>
        {:else}
            <div class="flex justify-between items-center text-slate-400">
                <div class="flex items-center gap-2">
                    <ShoppingCart size={20} />
                    <span class="text-sm">购物车为空</span>
                </div>
            </div>
        {/if}
    </div>

    <!-- Options Modal -->
    {#if showOptionsModal && selectedDish}
        {@const dishOptions = Array.isArray(selectedDish.options) ? selectedDish.options : []}
        <div 
            class="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" 
            role="dialog" 
            aria-modal="true"
            tabindex="-1"
            onkeydown={handleKeydown}
        >
            <button 
                type="button"
                class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
                onclick={closeModal}
                aria-label="关闭弹窗"
            ></button>
            <div class="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl p-6 space-y-4 relative z-10" role="document">
                <h3 class="text-lg font-bold">选择规格 - {selectedDish.name}</h3>
                
                {#if dishOptions.length > 0}
                    <div class="space-y-2">
                        <p class="text-sm text-slate-500">选项</p>
                        <div class="flex flex-wrap gap-2">
                            {#each dishOptions as option}
                                <button 
                                    onclick={() => {
                                        if (selectedOptions.includes(option)) {
                                            selectedOptions = selectedOptions.filter(o => o !== option);
                                        } else {
                                            selectedOptions = [option];
                                        }
                                    }}
                                    class="px-4 py-2 rounded-lg border text-sm transition-colors {selectedOptions.includes(option) ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-700 hover:border-orange-300'}"
                                >
                                    {option.name} {option.price > 0 ? `+¥${option.price}` : ''}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div class="flex gap-3 pt-4">
                    <button 
                        onclick={() => showOptionsModal = false}
                        class="flex-1 py-3 rounded-lg border border-slate-200 text-slate-700 font-medium"
                    >
                        取消
                    </button>
                    <button 
                        onclick={addToCart}
                        class="flex-1 py-3 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
                    >
                        加入购物车
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
