<script>
    import { enhance } from '$app/forms';
    
    let { categories = [], onSave, onClose } = $props();
    
    let isAdding = $state(false);
    let editingId = $state(null);
    let newName = $state('');
    let newIcon = $state('🍽️');
    let isSubmitting = $state(false);
    
    // 预设图标
    const icons = ['🔥', '🥗', '🥬', '🍚', '🍲', '🥤', '🍕', '🍜', '🍣', '🍰', '☕', '🍺'];
    
    function startAdd() {
        newName = '';
        newIcon = '🍽️';
        isAdding = true;
        editingId = null;
    }
    
    function startEdit(cat) {
        editingId = cat.id;
        newName = cat.name;
        newIcon = cat.icon || '🍽️';
        isAdding = false;
    }
    
    function cancelEdit() {
        editingId = null;
        isAdding = false;
        newName = '';
        newIcon = '🍽️';
    }
    
    function handleSubmit() {
        if (!newName.trim()) {
            alert('请输入分类名称');
            return;
        }
        isSubmitting = true;
        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'success') {
                onSave?.();
            }
            await update();
        };
    }
    
    function handleDelete(cat) {
        return async ({ result, update }) => {
            if (!confirm(`确定删除分类 "${cat.name}" 吗？该分类下的菜品将变为未分类状态。`)) {
                return;
            }
            if (result.type === 'success') {
                onSave?.();
            }
            await update();
        };
    }
</script>

<div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
>
    <button 
        type="button"
        class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
        onclick={onClose}
        aria-label="关闭弹窗"
    ></button>
    
    <div class="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col relative z-10">
        <header class="bg-white p-4 shadow-sm flex items-center gap-3 border-b">
            <button onclick={onClose} class="p-2 hover:bg-slate-100 rounded-full" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <h2 class="font-bold text-lg">分类管理</h2>
        </header>

        <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <!-- 新增/编辑表单 -->
            {#if isAdding || editingId}
                <div class="bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 class="font-medium">{isAdding ? '新增分类' : '编辑分类'}</h3>
                    
                    <div>
                        <label class="block text-sm text-slate-600 mb-1">分类名称</label>
                        <input 
                            type="text"
                            bind:value={newName}
                            placeholder="输入分类名称"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    
                    <div>
                        <label class="block text-sm text-slate-600 mb-1">图标</label>
                        <div class="flex flex-wrap gap-2">
                            {#each icons as icon}
                                <button 
                                    type="button"
                                    onclick={() => newIcon = icon}
                                    class="w-10 h-10 text-xl rounded-lg border-2 transition-colors {newIcon === icon ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}"
                                >
                                    {icon}
                                </button>
                            {/each}
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button 
                            type="button"
                            onclick={cancelEdit}
                            class="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm"
                        >
                            取消
                        </button>
                        <form 
                            method="POST" 
                            action={isAdding ? '?/createCategory' : '?/updateCategory'} 
                            use:enhance={handleSubmit}
                        >
                            {#if !isAdding}
                                <input type="hidden" name="categoryId" value={editingId} />
                            {/if}
                            <input type="hidden" name="name" value={newName} />
                            <input type="hidden" name="icon" value={newIcon} />
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                class="flex-1 py-2 px-4 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-50"
                            >
                                {isSubmitting ? '保存中...' : '保存'}
                            </button>
                        </form>
                    </div>
                </div>
            {/if}
            
            <!-- 分类列表 -->
            <div class="space-y-1">
                {#each categories as cat, index (cat.id)}
                    <div class="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-2">
                        <span class="text-2xl">{cat.icon || '🍽️'}</span>
                        <span class="flex-1 font-medium">{cat.name}</span>
                        <span class="text-xs text-slate-400">排序: {cat.sort_order}</span>
                        
                        <div class="flex items-center gap-1">
                            <form method="POST" action="?/moveCategory">
                                <input type="hidden" name="categoryId" value={cat.id} />
                                <input type="hidden" name="direction" value="up" />
                                <button 
                                    type="submit"
                                    class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 {index === 0 ? 'opacity-30' : ''}"
                                    disabled={index === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                </button>
                            </form>
                            <form method="POST" action="?/moveCategory">
                                <input type="hidden" name="categoryId" value={cat.id} />
                                <input type="hidden" name="direction" value="down" />
                                <button 
                                    type="submit"
                                    class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 {index === categories.length - 1 ? 'opacity-30' : ''}"
                                    disabled={index === categories.length - 1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                            </form>
                            <button 
                                type="button"
                                onclick={() => startEdit(cat)}
                                class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <form method="POST" action="?/deleteCategory" use:enhance={handleDelete(cat)}>
                                <input type="hidden" name="categoryId" value={cat.id} />
                                <button 
                                    type="submit"
                                    class="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-500"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                </button>
                            </form>
                        </div>
                    </div>
                {/each}
                
                {#if categories.length === 0}
                    <div class="text-center py-8 text-slate-400">
                        <p>暂无分类</p>
                    </div>
                {/if}
            </div>
            
            {#if !isAdding && !editingId}
                <button 
                    type="button"
                    onclick={startAdd}
                    class="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                    + 添加分类
                </button>
            {/if}
        </div>

        <footer class="bg-white p-4 border-t border-slate-200">
            <button 
                type="button"
                onclick={onClose}
                class="w-full py-3 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
            >
                关闭
            </button>
        </footer>
    </div>
</div>
