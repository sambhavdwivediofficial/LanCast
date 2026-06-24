#[cfg(target_os = "macos")]
mod inner {
    use objc2::rc::Id;
    use objc2_app_kit::{NSWindow, NSWindowSharingType};
    use tauri::Window;

    pub fn protect(window: &Window) -> Result<(), String> {
        let ns_window = get_ns_window(window)?;
        unsafe {
            ns_window.setSharingType(NSWindowSharingType::NSWindowSharingNone);
        }
        Ok(())
    }

    pub fn unprotect(window: &Window) -> Result<(), String> {
        let ns_window = get_ns_window(window)?;
        unsafe {
            ns_window.setSharingType(NSWindowSharingType::NSWindowSharingReadOnly);
        }
        Ok(())
    }

    fn get_ns_window(window: &Window) -> Result<Id<NSWindow>, String> {
        use tauri::Manager;
        let ptr = window
            .ns_window()
            .map_err(|e| format!("Failed to get NSWindow: {e}"))?;
        unsafe { Id::retain(ptr as *mut NSWindow).ok_or_else(|| "NSWindow pointer is null".into()) }
    }
}

#[cfg(not(target_os = "macos"))]
mod inner {
    use tauri::Window;

    pub fn protect(_window: &Window) -> Result<(), String> {
        Ok(())
    }

    pub fn unprotect(_window: &Window) -> Result<(), String> {
        Ok(())
    }
}
