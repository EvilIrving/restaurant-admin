import QRCode from 'qrcode';

/**
 * 生成美观的二维码图片（包含品牌元素）
 * 返回一个包含完整设计的数据URL
 * @param {string} tableId - 桌号
 * @param {string} baseUrl - 基础URL
 * @param {number} scale - 缩放倍数，默认3倍（高清）
 */
export async function generateStyledQRCode(tableId, baseUrl = '', scale = 3) {
    const qrData = `${baseUrl}/order/${tableId}`;
    
    // 1. 生成高分辨率基础二维码
    const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 600 * scale,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
            dark: '#1a1a2e',
            light: '#ffffff'
        }
    });
    
    // 2. 创建包含完整设计的图片
    return await createCompositeQRImage(qrDataUrl, tableId, scale);
}

/**
 * 创建组合图片 - 将二维码与品牌元素合并
 */
async function createCompositeQRImage(qrDataUrl, tableId, scale = 3) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = qrDataUrl;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 基础尺寸（逻辑像素）
            const baseWidth = 600;
            const baseHeight = 750;
            
            // 实际画布尺寸（物理像素）= 基础尺寸 × 缩放倍数
            const width = baseWidth * scale;
            const height = baseHeight * scale;
            canvas.width = width;
            canvas.height = height;
            
            // 缩放上下文以适应高分辨率
            ctx.scale(scale, scale);
            
            // 启用图像平滑（抗锯齿）
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 1. 背景渐变
            const gradient = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
            gradient.addColorStop(0, '#fff9f0');
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(1, '#fff5e6');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, baseWidth, baseHeight);
            
            // 2. 卡片背景（带阴影）
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;
            
            ctx.fillStyle = '#ffffff';
            roundRect(ctx, 40, 40, baseWidth - 80, baseHeight - 80, 20);
            ctx.fill();
            
            // 重置阴影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // 3. 顶部装饰条
            const topGradient = ctx.createLinearGradient(40, 40, baseWidth - 40, 40);
            topGradient.addColorStop(0, '#ff9a48');
            topGradient.addColorStop(0.5, '#ff6b35');
            topGradient.addColorStop(1, '#ff9a48');
            ctx.fillStyle = topGradient;
            roundRect(ctx, 40, 40, baseWidth - 80, 6, [20, 20, 0, 0]);
            ctx.fill();
            
            // 4. 品牌徽章
            ctx.fillStyle = '#ff6b35';
            roundRect(ctx, (baseWidth - 180) / 2, 80, 180, 40, 20);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('扫码点餐', baseWidth / 2, 100);
            
            // 5. 桌号
            ctx.fillStyle = '#1a1a2e';
            ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(tableId, baseWidth / 2, 220);
            
            // 桌号标签
            ctx.fillStyle = '#888888';
            ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('桌号 TABLE', baseWidth / 2, 260);
            
            // 6. 二维码容器 - 增大尺寸
            const qrContainerSize = 320;
            const qrSize = 280;
            const qrContainerX = (baseWidth - qrContainerSize) / 2;
            const qrContainerY = 290;
            
            ctx.fillStyle = '#fafafa';
            roundRect(ctx, qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 12);
            ctx.fill();
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 绘制二维码 - 使用更大的尺寸
            const qrX = (baseWidth - qrSize) / 2;
            const qrY = qrContainerY + (qrContainerSize - qrSize) / 2;
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
            
            // 7. 扫描提示框
            ctx.fillStyle = '#1a1a2e';
            roundRect(ctx, (baseWidth - 280) / 2, 640, 280, 50, 12);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('扫码点餐 · 免排队', baseWidth / 2, 668);
            
            // 8. 信任标签
            ctx.fillStyle = '#666666';
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('官方正版  请放心扫码', baseWidth / 2, 720);
            
            // 导出高质量PNG
            resolve(canvas.toDataURL('image/png', 1.0));
        };
        
        img.onerror = () => {
            // 如果图片加载失败，返回原始二维码
            resolve(qrDataUrl);
        };
    });
}

/**
 * 绘制圆角矩形
 */
function roundRect(ctx, x, y, width, height, radius) {
    const radii = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
    ctx.beginPath();
    ctx.moveTo(x + radii[0], y);
    ctx.lineTo(x + width - radii[1], y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radii[1]);
    ctx.lineTo(x + width, y + height - radii[2]);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radii[2], y + height);
    ctx.lineTo(x + radii[3], y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radii[3]);
    ctx.lineTo(x, y + radii[0]);
    ctx.quadraticCurveTo(x, y, x + radii[0], y);
    ctx.closePath();
}

export async function downloadQRCodeImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}