/**
 * 检查是否为桌面应用模式
 * 优先检查 Tauri 环境变量，如果不在 Tauri 中则调用后端 API 检查
 */
export async function isDesktopMode(): Promise<boolean> {
  // 首先检查 Tauri 环境（最可靠的方式）
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return true
  }
  
  // 如果不在 Tauri 中，尝试通过后端 API 检查
  // 检查 URL 参数中是否有 desktop 标志
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('mode') === 'desktop') {
    return true
  }
  
  // 如果以上都不满足，检查本地存储中是否有桌面模式标志
  // 这个标志可以通过后端响应或用户设置来设置
  try {
    const desktopModeFlag = localStorage.getItem('autoclip_desktop_mode')
    if (desktopModeFlag === 'true') {
      return true
    }
  } catch (e) {
    // localStorage 可能不可用
  }
  
  // 默认返回 false，表示 Web 模式
  return false
}

/**
 * 手动设置桌面模式标志
 * 通常在检测到后端处于桌面模式时调用
 */
export function setDesktopMode(enabled: boolean): void {
  try {
    localStorage.setItem('autoclip_desktop_mode', enabled ? 'true' : 'false')
  } catch (e) {
    console.warn('无法设置桌面模式标志:', e)
  }
}
