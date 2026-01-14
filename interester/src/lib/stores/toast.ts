import { writable } from 'svelte/store';

export type ToastType = "success" | "error" | "info";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    function add(message: string, type: ToastType = 'info', duration = 3000) {
        const id = crypto.randomUUID();
        update(toasts => [...toasts, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    }

    function remove(id: string) {
        update(toasts => toasts.filter(t => t.id !== id));
    }

    return {
        subscribe,
        add,
        success: (msg: string, duration?: number) => add(msg, 'success', duration),
        error: (msg: string, duration?: number) => add(msg, 'error', duration),
        info: (msg: string, duration?: number) => add(msg, 'info', duration),
        remove
    };
}

export const toast = createToastStore();
