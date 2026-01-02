# 实现计划：高优先级功能

## 概述

实现 PRD 中定义的高优先级缺失功能：
1. 删除桌子功能
2. 桌子二维码生成与下载
3. 订单状态修改功能

---

## 任务 1：删除桌子功能

### 后端 (src/routes/admin/+page.server.js)

```javascript
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
}
```

### 前端 (src/routes/admin/+page.svelte)

在桌台卡片上添加删除按钮：

```svelte
<button 
    onclick={() => deleteTable(table.table_id)}
    class="p-2 hover:bg-red-50 rounded-lg text-red-500"
    title="删除"
>
    <Trash2 size={18} />
</button>
```

---

## 任务 2：桌子二维码生成与下载

### 安装依赖

```bash
pnpm add qrcode
```

### 创建二维码生成工具 (src/lib/qrcode.js)

```javascript
import QRCode from 'qrcode';

export async function generateQRCode(dataUrl, options = {}) {
    const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    };
    
    return await QRCode.toDataURL(dataUrl, { ...defaultOptions, ...options });
}

export async function generateQRCodePDF(tableId, qrDataUrl) {
    // 使用 jspdf 生成 PDF
    // 或返回包含二维码和桌号信息的 HTML 打印页面
}
```

### 更新后台桌子列表 UI

在每个桌台卡片上添加二维码按钮：

```svelte
<button 
    onclick={() => showQRCode(table.table_id)}
    class="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
    title="显示二维码"
>
    <QrCode size={18} />
</button>
```

### 添加二维码模态框

```svelte
{#if showQRModal}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-xl p-6 text-center">
            <h3 class="font-bold mb-4">桌号 {selectedTableId} 二维码</h3>
            <img src={qrCodeUrl} alt="桌号二维码" class="mx-auto mb-4" />
            <div class="flex gap-2">
                <button onclick={downloadQRCode} class="flex-1 py-2 bg-orange-500 text-white rounded-lg">
                    下载图片
                </button>
                <button onclick={printQRCode} class="flex-1 py-2 bg-slate-800 text-white rounded-lg">
                    打印
                </button>
            </div>
        </div>
    </div>
{/if}
```

---

## 任务 3：订单状态修改功能

### 后端 (src/routes/admin/+page.server.js)

```javascript
updateOrderStatus: async ({ request, locals }) => {
    const formData = await request.formData();
    const orderId = formData.get('orderId');
    const status = formData.get('status'); // pending / cooking / done
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
```

### 前端更新订单详情模态框

在订单详情模态框中添加状态选择器：

```svelte
<div class="flex items-center gap-2 mb-4">
    <span class="text-sm text-slate-500">订单状态:</span>
    <select 
        value={order.status}
        onchange={(e) => updateOrderStatus(order.id, e.target.value)}
        class="px-3 py-1 border border-slate-200 rounded-lg text-sm"
    >
        <option value="pending">待制作</option>
        <option value="cooking">制作中</option>
        <option value="done">已完成</option>
    </select>
</div>
```

### 状态颜色标识

```svelte
<span class="text-xs px-2 py-1 rounded-full {
    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
    order.status === 'cooking' ? 'bg-orange-100 text-orange-700' :
    'bg-green-100 text-green-700'
}">
    {order.status === 'pending' ? '待制作' : 
     order.status === 'cooking' ? '制作中' : '已完成'}
</span>
```

---

## 任务 4：更新 UI 交互

### 桌台卡片操作区

```svelte
<div class="flex items-center gap-1">
    <button 
        onclick={() => showQRCode(table.table_id)}
        class="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
        title="二维码"
    >
        <QrCode size={18} />
    </button>
    {#if !getTableStatus(table.table_id)}
        <form method="POST" action="?/deleteTable" use:enhance={deleteTableHandler}>
            <input type="hidden" name="tableId" value={table.table_id} />
            <button 
                type="submit"
                class="p-2 hover:bg-red-50 rounded-lg text-red-500"
                title="删除"
            >
                <Trash2 size={18} />
            </button>
        </form>
    {/if}
</div>
```

---

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/routes/admin/+page.server.js` | 添加 `deleteTable`、`updateOrderStatus` action |
| `src/routes/admin/+page.svelte` | 添加二维码模态框、删除按钮、状态选择器 |
| `src/lib/qrcode.js` | 新建，二维码生成工具函数 |
| `package.json` | 添加 `qrcode` 依赖 |

---

## 执行顺序

1. 安装 `qrcode` 依赖
2. 创建 `src/lib/qrcode.js`
3. 更新 `src/routes/admin/+page.server.js` 添加新 action
4. 更新 `src/routes/admin/+page.svelte` 添加 UI 和交互
