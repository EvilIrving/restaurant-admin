import { browser } from '$app/environment';

let cartItems = $state([]);
let isOpen = $state(false);

// 从 localStorage 加载购物车
if (browser) {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
    }
}

// 保存购物车到 localStorage
function saveCart() {
    if (browser) {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }
}

export const cart = {
    get items() { return cartItems; },
    get isOpen() { return isOpen; },
    get total() {
        return cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    },
    get count() {
        return cartItems.reduce((sum, item) => sum + item.qty, 0);
    },
    
    addItem(dish, options = []) {
        const existing = cartItems.find(item => 
            item.id === dish.id && 
            JSON.stringify(item.selectedOptions) === JSON.stringify(options)
        );
        
        if (existing) {
            cartItems = cartItems.map(item => 
                item === existing ? { ...item, qty: item.qty + 1 } : item
            );
        } else {
            cartItems = [...cartItems, { 
                ...dish, 
                qty: 1, 
                selectedOptions: options 
            }];
        }
        saveCart();
    },
    
    updateQuantity(index, qty) {
        if (qty <= 0) {
            this.removeItem(index);
            return;
        }
        cartItems[index].qty = qty;
        cartItems = [...cartItems]; // 触发响应
        saveCart();
    },
    
    removeItem(index) {
        cartItems = cartItems.filter((_, i) => i !== index);
        saveCart();
    },
    
    clear() {
        cartItems = [];
        isOpen = false;
        saveCart();
    },
    
    toggle() {
        isOpen = !isOpen;
    },
    
    open() {
        isOpen = true;
    },
    
    close() {
        isOpen = false;
    }
};
