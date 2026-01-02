<script>
    import { QrCode, ChefHat, Utensils } from 'lucide-svelte';
</script>

<svelte:head>
    <title>扫码点餐系统</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 space-y-8">
    <div class="text-center">
        <div class="bg-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/50">
            <Utensils size={32} />
        </div>
        <h1 class="text-3xl font-bold">扫码点餐系统 v1.2</h1>
        <p class="text-slate-400 mt-2">SvelteKit + Supabase 原型演示</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
        <a 
            href="/order/demo"
            class="flex flex-col items-center p-6 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
        >
            <QrCode size={40} class="mb-3 text-blue-400" />
            <span class="font-bold text-lg">我是顾客</span>
            <span class="text-xs text-slate-500 mt-1">模拟扫码点餐</span>
        </a>

        <a 
            href="/admin"
            class="flex flex-col items-center p-6 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
        >
            <ChefHat size={40} class="mb-3 text-orange-400" />
            <span class="font-bold text-lg">我是店员</span>
            <span class="text-xs text-slate-500 mt-1">后台管理 / 结账</span>
        </a>
    </div>
</div>
