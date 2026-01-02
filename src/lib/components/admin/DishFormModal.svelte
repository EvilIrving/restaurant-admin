<script>
    import { enhance } from '$app/forms';
    
    let { dish = null, categories = [], onSave, onClose } = $props();
    
    // 表单状态
    let name = $state(dish?.name || '');
    let description = $state(dish?.description || '');
    let price = $state(dish?.price?.toString() || '');
    let originalPrice = $state(dish?.original_price?.toString() || '');
    let category = $state(dish?.category || (categories[0]?.name || ''));
    let imageUrl = $state(dish?.image_url || '');
    let isAvailable = $state(dish?.is_available ?? true);
    let isRecommended = $state(dish?.is_recommended ?? false);
    let sortOrder = $state(dish?.sort_order?.toString() || '0');
    
    // 规格选项
    let specs = $state(dish?.options?.specs || []);
    let showSpecModal = $state(false);
    let editingSpecIndex = $state(-1);
    let specName = $state('');
    let specValues = $state([]);
    let newSpecValue = $state({ name: '', price: '0' });
    
    let isSubmitting = $state(false);
    let errors = $state({});
    
    function validate() {
        errors = {};
        if (!name.trim()) errors.name = '请输入菜品名称';
        if (!category) errors.category = '请选择菜品分类';
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            errors.price = '请输入有效价格';
        }
        return Object.keys(errors).length === 0;
    }
    
    function addSpec() {
        specName = '';
        specValues = [];
        editingSpecIndex = -1;
        showSpecModal = true;
    }
    
    function editSpec(index) {
        const spec = specs[index];
        specName = spec.name;
        specValues = [...spec.values];
        editingSpecIndex = index;
        showSpecModal = true;
    }
    
    function saveSpec() {
        if (!specName.trim()) {
            alert('请输入规格名称');
            return;
        }
        if (specValues.length === 0) {
            alert('请至少添加一个选项');
            return;
        }
        
        const newSpec = {
            name: specName,
            values: specValues.map(v => ({
                name: v.name,
                price: parseFloat(v.price) || 0
            }))
        };
        
        if (editingSpecIndex >= 0) {
            specs[editingSpecIndex] = newSpec;
        } else {
            specs = [...specs, newSpec];
        }
        
        showSpecModal = false;
    }
    
    function removeSpec(index) {
        specs = specs.filter((_, i) => i !== index);
    }
    
    function addSpecValue() {
        if (!newSpecValue.name.trim()) {
            alert('请输入选项名称');
            return;
        }
        specValues = [...specValues, { ...newSpecValue }];
        newSpecValue = { name: '', price: '0' };
    }
    
    function removeSpecValue(index) {
        specValues = specValues.filter((_, i) => i !== index);
    }
    
    function handleSubmit() {
        if (!validate()) return;
        
        isSubmitting = true;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                onSave?.(result.data);
            }
            isSubmitting = false;
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
    
    <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative z-10">
        <header class="bg-white p-4 shadow-sm flex items-center gap-3 border-b">
            <button onclick={onClose} class="p-2 hover:bg-slate-100 rounded-full" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <h2 class="font-bold text-lg">{dish ? '编辑菜品' : '新增菜品'}</h2>
        </header>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- 基本信息 -->
            <div class="space-y-3">
                <h3 class="text-sm font-bold text-slate-500 uppercase">基本信息</h3>
                
                <div>
                    <label class="block text-sm text-slate-600 mb-1">菜品名称 *</label>
                    <input 
                        type="text" 
                        bind:value={name}
                        placeholder="输入菜品名称"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 {errors.name ? 'border-red-500' : ''}"
                    />
                    {#if errors.name}
                        <p class="text-xs text-red-500 mt-1">{errors.name}</p>
                    {/if}
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm text-slate-600 mb-1">分类 *</label>
                        <select 
                            bind:value={category}
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        >
                            <option value="">选择分类</option>
                            {#each categories as cat}
                                <option value={cat.name}>{cat.name}</option>
                            {/each}
                        </select>
                        {#if errors.category}
                            <p class="text-xs text-red-500 mt-1">{errors.category}</p>
                        {/if}
                    </div>
                    
                    <div>
                        <label class="block text-sm text-slate-600 mb-1">价格 *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                            <input 
                                type="number" 
                                bind:value={price}
                                placeholder="0"
                                step="0.01"
                                min="0"
                                class="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 {errors.price ? 'border-red-500' : ''}"
                            />
                        </div>
                        {#if errors.price}
                            <p class="text-xs text-red-500 mt-1">{errors.price}</p>
                        {/if}
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm text-slate-600 mb-1">原价（可选，用于促销显示）</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                        <input 
                            type="number" 
                            bind:value={originalPrice}
                            placeholder="0"
                            step="0.01"
                            min="0"
                            class="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm text-slate-600 mb-1">菜品描述</label>
                    <textarea 
                        bind:value={description}
                        placeholder="输入菜品描述，如：肥而不腻，入口即化..."
                        maxlength="200"
                        rows="2"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                    ></textarea>
                    <p class="text-xs text-slate-400 text-right">{description.length}/200</p>
                </div>
            </div>
            
            <!-- 图片 -->
            <div class="space-y-3">
                <h3 class="text-sm font-bold text-slate-500 uppercase">菜品图片</h3>
                
                <div class="flex gap-3">
                    <div class="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-3xl overflow-hidden shrink-0 border border-slate-200">
                        {#if imageUrl}
                            <img src={imageUrl} alt="预览" class="w-full h-full object-cover" />
                        {:else}
                            <span>🍽️</span>
                        {/if}
                    </div>
                    <div class="flex-1">
                        <input 
                            type="url" 
                            bind:value={imageUrl}
                            placeholder="输入图片 URL 或粘贴链接"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                        />
                        <p class="text-xs text-slate-400 mt-1">支持 JPG/PNG 格式，建议尺寸 200x200</p>
                    </div>
                </div>
            </div>
            
            <!-- 规格选项 -->
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <h3 class="text-sm font-bold text-slate-500 uppercase">规格选项</h3>
                    <button 
                        onclick={addSpec}
                        class="text-sm text-orange-500 hover:text-orange-600"
                    >
                        + 添加规格
                    </button>
                </div>
                
                {#if specs.length > 0}
                    <div class="space-y-2">
                        {#each specs as spec, index}
                            <div class="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <span class="font-medium">{spec.name}</span>
                                    <span class="text-sm text-slate-500 ml-2">({spec.values.length} 个选项)</span>
                                </div>
                                <div class="flex gap-2">
                                    <button 
                                        onclick={() => editSpec(index)}
                                        class="p-1 hover:bg-slate-200 rounded text-slate-500"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                    </button>
                                    <button 
                                        onclick={() => removeSpec(index)}
                                        class="p-1 hover:bg-red-100 rounded text-red-500"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 text-center py-4">暂无规格选项</p>
                {/if}
            </div>
            
            <!-- 其他设置 -->
            <div class="space-y-3">
                <h3 class="text-sm font-bold text-slate-500 uppercase">其他设置</h3>
                
                <div class="flex flex-wrap gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            bind:checked={isAvailable}
                            class="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <span class="text-sm">上架销售</span>
                    </label>
                    
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            bind:checked={isRecommended}
                            class="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <span class="text-sm">推荐菜品</span>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm text-slate-600 mb-1">排序权重</label>
                    <input 
                        type="number" 
                        bind:value={sortOrder}
                        placeholder="0"
                        min="0"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                    <p class="text-xs text-slate-400 mt-1">数字越大越靠前</p>
                </div>
            </div>
        </div>

        <footer class="bg-white p-4 border-t border-slate-200 flex gap-3">
            <button 
                onclick={onClose}
                class="flex-1 py-3 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
            >
                取消
            </button>
            <form method="POST" action={dish ? '?/updateDish' : '?/createDish'} use:enhance={handleSubmit}>
                {#if dish}
                    <input type="hidden" name="dishId" value={dish.id} />
                {/if}
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="description" value={description} />
                <input type="hidden" name="price" value={price} />
                <input type="hidden" name="originalPrice" value={originalPrice} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="imageUrl" value={imageUrl} />
                <input type="hidden" name="isAvailable" value={isAvailable} />
                <input type="hidden" name="isRecommended" value={isRecommended} />
                <input type="hidden" name="sortOrder" value={sortOrder} />
                <input type="hidden" name="options" value={JSON.stringify({ specs })} />
                
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    class="flex-1 py-3 px-6 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                    {isSubmitting ? '保存中...' : '保存菜品'}
                </button>
            </form>
        </footer>
    </div>
</div>

<!-- 规格编辑弹窗 -->
{#if showSpecModal}
    <div 
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
    >
        <button 
            type="button"
            class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
            onclick={() => showSpecModal = false}
        ></button>
        
        <div class="bg-white rounded-xl w-full max-w-sm overflow-hidden relative z-10">
            <header class="bg-white p-4 shadow-sm border-b">
                <h3 class="font-bold">{editingSpecIndex >= 0 ? '编辑规格' : '添加规格'}</h3>
            </header>
            
            <div class="p-4 space-y-4">
                <div>
                    <label class="block text-sm text-slate-600 mb-1">规格名称</label>
                    <input 
                        type="text"
                        bind:value={specName}
                        placeholder="如：辣度、加料"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                </div>
                
                <div>
                    <label class="block text-sm text-slate-600 mb-1">选项列表</label>
                    <div class="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        {#each specValues as value, index}
                            <div class="flex gap-2 items-center">
                                <input 
                                    type="text"
                                    bind:value={value.name}
                                    placeholder="选项名称"
                                    class="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                                />
                                <div class="relative w-20">
                                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                                    <input 
                                        type="number"
                                        bind:value={value.price}
                                        placeholder="0"
                                        class="w-full pl-5 pr-2 py-1 border border-slate-200 rounded text-sm"
                                    />
                                </div>
                                <button 
                                    onclick={() => removeSpecValue(index)}
                                    class="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                                </button>
                            </div>
                        {/each}
                    </div>
                    
                    <div class="flex gap-2">
                        <input 
                            type="text"
                            bind:value={newSpecValue.name}
                            placeholder="新选项"
                            class="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                        />
                        <div class="relative w-20">
                            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                            <input 
                                type="number"
                                bind:value={newSpecValue.price}
                                placeholder="0"
                                class="w-full pl-5 pr-2 py-1 border border-slate-200 rounded text-sm"
                            />
                        </div>
                        <button 
                            onclick={addSpecValue}
                            class="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                        >
                            添加
                        </button>
                    </div>
                </div>
            </div>
            
            <footer class="bg-white p-4 border-t border-slate-200 flex gap-3">
                <button 
                    onclick={() => showSpecModal = false}
                    class="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm"
                >
                    取消
                </button>
                <button 
                    onclick={saveSpec}
                    class="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600"
                >
                    保存规格
                </button>
            </footer>
        </div>
    </div>
{/if}
