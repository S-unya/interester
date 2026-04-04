import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * Request notification permission if not already granted.
 */
async function requestNotificationPermission(): Promise<boolean> {
	let permission = await isPermissionGranted();
	if (!permission) {
		const result = await requestPermission();
		permission = result === "granted";
	}
	return permission;
}

/**
 * Send a system notification.
 */
export async function sendSystemNotification(
	title: string,
	body: string,
): Promise<void> {
	const permission = await requestNotificationPermission();
	if (permission) {
		sendNotification({ title, body });
	} else {
		console.warn("Notification permission denied, cannot send:", title);
	}
}
