/**
 * 简化的进度状态管理 - 基于固定阶段和轮询
 */

import { create } from 'zustand'

export interface SimpleProgress {
  project_id: string
  stage: string
  percent: number
  message: string
  ts: number
}

interface SimpleProgressState {
  // 状态数据
  byId: Record<string, SimpleProgress>
  
  // 轮询控制
  pollingInterval: number | null
  isPolling: boolean
  pollingProjectIds: string[]
  
  // 操作方法
  upsert: (progress: SimpleProgress) => void
  startPolling: (projectIds: string[], intervalMs?: number) => void
  stopPolling: () => void
  addPollingProject: (projectId: string, intervalMs?: number) => void
  addPollingProjects: (projectIds: string[], intervalMs?: number) => void
  removePollingProject: (projectId: string) => void
  removePollingProjects: (projectIds: string[]) => void
  clearProgress: (projectId: string) => void
  clearAllProgress: () => void
  
  // 获取方法
  getProgress: (projectId: string) => SimpleProgress | null
  getAllProgress: () => Record<string, SimpleProgress>
}

export const useSimpleProgressStore = create<SimpleProgressState>((set, get) => {
  let timer: number | null = null

  // 执行轮询的实际函数
  const doPoll = async () => {
    const { pollingProjectIds, upsert, stopPolling } = get()
    
    if (pollingProjectIds.length === 0) {
      stopPolling()
      return
    }

    try {
      const queryString = pollingProjectIds.map(id => `project_ids=${id}`).join('&')
      const response = await fetch(`/api/v1/simple-progress/snapshot?${queryString}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const snapshots: SimpleProgress[] = await response.json()
      
      // 更新状态
      snapshots.forEach(snapshot => {
        upsert(snapshot)
      })
      
      console.log(`轮询更新: ${snapshots.length} 个项目`)
      
      // 如果所有项目均已到达终态，则自动停止轮询
      try {
        const allTerminal = snapshots.length > 0 && snapshots.every(s => {
          return isCompleted(s.stage) || isFailed(s.message)
        })
        if (snapshots.length > 0 && allTerminal) {
          console.log('所有项目已完成，自动停止轮询')
          stopPolling()
        } else if (snapshots.length === 0) {
          console.log('项目可能还在pending状态，继续轮询等待')
        }
      } catch (e) {
        console.warn('检测终态时出现问题:', e)
      }
      
    } catch (error) {
      console.error('轮询进度失败:', error)
    }
  }

  return {
    // 初始状态
    byId: {},
    pollingInterval: null,
    isPolling: false,
    pollingProjectIds: [],

    // 更新或插入进度数据
    upsert: (progress: SimpleProgress) => {
      set((state) => ({
        byId: {
          ...state.byId,
          [progress.project_id]: progress
        }
      }))
    },

    // 开始轮询（原有方法，保持兼容）
    startPolling: (projectIds: string[], intervalMs: number = 5000) => {
      const { stopPolling } = get()
      
      if (stopPolling) {
        stopPolling()
      }

      if (projectIds.length === 0) {
        console.warn('没有项目ID，跳过轮询')
        return
      }

      console.log(`开始轮询进度: ${projectIds.join(', ')}`)

      // 立即执行一次
      doPoll()

      // 设置定时器
      timer = setInterval(doPoll, intervalMs)

      set({
        isPolling: true,
        pollingInterval: intervalMs,
        pollingProjectIds: projectIds
      })
    },

    // 停止轮询
    stopPolling: () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      
      set({
        isPolling: false,
        pollingInterval: null,
        pollingProjectIds: []
      })
      
      console.log('停止轮询进度')
    },

    // 添加单个项目到轮询队列
    addPollingProject: (projectId: string, intervalMs: number = 5000) => {
      set((state) => {
        // 如果项目已在队列中，不重复添加
        if (state.pollingProjectIds.includes(projectId)) {
          return state
        }
        
        const newProjectIds = [...state.pollingProjectIds, projectId]
        
        // 如果之前没有在轮询，启动轮询
        if (!state.isPolling) {
          setTimeout(() => {
            // 立即执行一次
            doPoll()
            // 设置定时器
            timer = setInterval(doPoll, intervalMs)
          }, 0)
          
          return {
            ...state,
            isPolling: true,
            pollingInterval: intervalMs,
            pollingProjectIds: newProjectIds
          }
        }
        
        return {
          ...state,
          pollingProjectIds: newProjectIds
        }
      })
      
      console.log(`添加项目到轮询队列: ${projectId}`)
    },

    // 批量添加项目到轮询队列
    addPollingProjects: (projectIds: string[], intervalMs: number = 5000) => {
      set((state) => {
        // 过滤掉已在队列中的项目
        const newIds = projectIds.filter(id => !state.pollingProjectIds.includes(id))
        const newProjectIds = [...state.pollingProjectIds, ...newIds]
        
        if (newIds.length === 0) {
          return state
        }
        
        // 如果之前没有在轮询，启动轮询
        if (!state.isPolling) {
          setTimeout(() => {
            doPoll()
            timer = setInterval(doPoll, intervalMs)
          }, 0)
          
          return {
            ...state,
            isPolling: true,
            pollingInterval: intervalMs,
            pollingProjectIds: newProjectIds
          }
        }
        
        return {
          ...state,
          pollingProjectIds: newProjectIds
        }
      })
      
      console.log(`批量添加项目到轮询队列: ${projectIds.join(', ')}`)
    },

    // 从轮询队列中移除单个项目
    removePollingProject: (projectId: string) => {
      set((state) => {
        const newProjectIds = state.pollingProjectIds.filter(id => id !== projectId)
        
        // 如果队列为空，停止轮询
        if (newProjectIds.length === 0 && state.isPolling) {
          if (timer) {
            clearInterval(timer)
            timer = null
          }
          
          return {
            ...state,
            isPolling: false,
            pollingInterval: null,
            pollingProjectIds: []
          }
        }
        
        return {
          ...state,
          pollingProjectIds: newProjectIds
        }
      })
      
      console.log(`从轮询队列移除项目: ${projectId}`)
    },

    // 批量从轮询队列移除项目
    removePollingProjects: (projectIds: string[]) => {
      set((state) => {
        const newProjectIds = state.pollingProjectIds.filter(id => !projectIds.includes(id))
        
        // 如果队列为空，停止轮询
        if (newProjectIds.length === 0 && state.isPolling) {
          if (timer) {
            clearInterval(timer)
            timer = null
          }
          
          return {
            ...state,
            isPolling: false,
            pollingInterval: null,
            pollingProjectIds: []
          }
        }
        
        return {
          ...state,
          pollingProjectIds: newProjectIds
        }
      })
      
      console.log(`批量从轮询队列移除项目: ${projectIds.join(', ')}`)
    },

    // 清除单个项目进度
    clearProgress: (projectId: string) => {
      set((state) => {
        const newById = { ...state.byId }
        delete newById[projectId]
        return { byId: newById }
      })
    },

    // 清除所有进度
    clearAllProgress: () => {
      set({ byId: {} })
    },

    // 获取单个项目进度
    getProgress: (projectId: string) => {
      return get().byId[projectId] || null
    },

    // 获取所有进度
    getAllProgress: () => {
      return get().byId
    }
  }
})

// 阶段显示名称映射
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  'INGEST': '素材准备',
  'SUBTITLE': '字幕处理',
  'ANALYZE': '内容分析', 
  'HIGHLIGHT': '片段定位',
  'EXPORT': '视频导出',
  'DONE': '处理完成'
}

// 阶段颜色映射
export const STAGE_COLORS: Record<string, string> = {
  'INGEST': '#1890ff',      // 蓝色
  'SUBTITLE': '#52c41a',    // 绿色
  'ANALYZE': '#fa8c16',     // 橙色
  'HIGHLIGHT': '#722ed1',   // 紫色
  'EXPORT': '#eb2f96',      // 粉色
  'DONE': '#13c2c2'         // 青色
}

// 获取阶段显示名称
export const getStageDisplayName = (stage: string): string => {
  return STAGE_DISPLAY_NAMES[stage] || stage
}

// 获取阶段颜色
export const getStageColor = (stage: string): string => {
  return STAGE_COLORS[stage] || '#666666'
}

// 判断是否为完成状态
export const isCompleted = (stage: string): boolean => {
  return stage === 'DONE'
}

// 判断是否为失败状态
export const isFailed = (message: string): boolean => {
  return message.includes('失败') || message.includes('错误') || message.includes('失败')
}
