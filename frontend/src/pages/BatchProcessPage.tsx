import React, { useState, useEffect, useRef } from 'react'
import { 
  Layout, Card, Table, Button, Progress, Tag, Space, Upload, 
  message, Modal, Typography, Alert, Empty, Spin, Badge, Statistic, Row, Col 
} from 'antd'
import { 
  PlayCircleOutlined, StopOutlined, DeleteOutlined, PlusOutlined, 
  UploadOutlined, ReloadOutlined, VideoCameraOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, CloudUploadOutlined
} from '@ant-design/icons'
import { batchApi } from '../services/api'
import './BatchProcessPage.css'

const { Content } = Layout
const { Title, Text } = Typography
const { Dragger } = Upload

interface QueueItem {
  id: number
  project_name: string
  video_path: string
  status: string
  progress: number
  current_step: string | null
  error_message: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
}

interface QueueStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  current: QueueItem | null
}

const BatchProcessPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [queueList, setQueueList] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<QueueStats>({
    total: 0, pending: 0, processing: 0, completed: 0, failed: 0, current: null
  })
  const [isRunning, setIsRunning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadQueueData()
    loadBatchStatus()
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      refreshTimerRef.current = setInterval(() => {
        loadQueueData()
      }, 2000)
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [isRunning])

  const loadQueueData = async () => {
    try {
      const [statsData, listData] = await Promise.all([
        batchApi.getQueueStats(),
        batchApi.getQueueList()
      ])
      setStats(statsData)
      setQueueList(listData)
    } catch (error) {
      console.error('加载队列数据失败:', error)
    }
  }

  const loadBatchStatus = async () => {
    try {
      const status = await batchApi.getBatchStatus()
      setIsRunning(status.running)
    } catch (error) {
      console.error('加载批量处理状态失败:', error)
    }
  }

  const handleStartProcessing = async () => {
    try {
      setLoading(true)
      await batchApi.startBatchProcessing()
      setIsRunning(true)
      message.success('批量处理已启动')
      loadQueueData()
    } catch (error) {
      message.error('启动失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStopProcessing = async () => {
    try {
      setLoading(true)
      await batchApi.stopBatchProcessing()
      setIsRunning(false)
      message.success('批量处理已停止')
      loadQueueData()
    } catch (error) {
      message.error('停止失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    try {
      await batchApi.removeFromQueue(itemId)
      message.success('已从队列移除')
      loadQueueData()
    } catch (error) {
      message.error('移除失败')
    }
  }

  const handleClearQueue = async (clearStatus?: string) => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空队列吗？',
      onOk: async () => {
        try {
          await batchApi.clearQueue(clearStatus)
          message.success('队列已清空')
          loadQueueData()
        } catch (error) {
          message.error('清空失败')
        }
      }
    })
  }

  const handleFileUpload = async (options: any) => {
    const { file, onSuccess, onError } = options
    
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('files', file)
      
      const response = await batchApi.addToQueue([{
        video_path: (file as any).path || file.name,
        project_name: (file as any).name?.replace(/\.[^/.]+$/, '') || String(file)
      }])
      
      if (response.success) {
        message.success(`已添加: ${file.name}`)
        loadQueueData()
        onSuccess(response)
      } else {
        message.error(response.message || '添加失败')
        onError(new Error(response.message))
      }
    } catch (error: any) {
      message.error(`添加失败: ${error.message || '未知错误'}`)
      onError(error)
    } finally {
      setUploading(false)
    }
  }

  const handleBatchUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'
    
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files)
      if (files.length === 0) return

      try {
        setUploading(true)
        const videos = files.map(file => ({
          video_path: file.path || file.name,
          project_name: file.name.replace(/\.[^/.]+$/, '')
        }))
        
        const response = await batchApi.addToQueue(videos)
        
        if (response.success) {
          message.success(`已添加 ${files.length} 个视频到队列`)
          loadQueueData()
        } else {
          message.error(response.message || '添加失败')
        }
      } catch (error: any) {
        message.error(`添加失败: ${error.message || '未知错误'}`)
      } finally {
        setUploading(false)
      }
    }
    
    input.click()
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
      processing: { color: 'processing', icon: <PlayCircleOutlined />, text: '处理中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: '失败' },
      cancelled: { color: 'default', icon: <StopOutlined />, text: '已取消' }
    }
    const config = statusMap[status] || statusMap.pending
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record: QueueItem) => (
        record.status === 'processing' ? (
          <div>
            <Progress percent={Math.round(progress)} size="small" status="active" />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.current_step}</Text>
          </div>
        ) : (
          <Text type="secondary">{Math.round(progress)}%</Text>
        )
      )
    },
    {
      title: '视频路径',
      dataIndex: 'video_path',
      key: 'video_path',
      ellipsis: true,
      render: (path: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{path}</Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: QueueItem) => (
        record.status !== 'processing' && (
          <Button 
            type="text" 
            danger 
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveItem(record.id)}
          >
            移除
          </Button>
        )
      )
    }
  ]

  return (
    <Content className="batch-page">
      <div className="batch-container">
        <Title level={2} className="batch-title">
          <VideoCameraOutlined /> 批量处理
        </Title>

        <Row gutter={16} className="stats-row">
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="总任务" 
                value={stats.total} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<VideoCameraOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="等待中" 
                value={stats.pending} 
                valueStyle={{ color: '#999' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="处理中" 
                value={stats.processing} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="已完成" 
                value={stats.completed} 
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card className="batch-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="batch-actions">
              <Space>
                {isRunning ? (
                  <Button 
                    type="primary" 
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStopProcessing}
                    loading={loading}
                  >
                    停止处理
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartProcessing}
                    loading={loading}
                    disabled={stats.pending === 0}
                  >
                    开始处理
                  </Button>
                )}
                <Button 
                  icon={<PlusOutlined />}
                  onClick={handleBatchUpload}
                  loading={uploading}
                >
                  添加视频
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadQueueData}
                >
                  刷新
                </Button>
              </Space>
              <Space>
                <Button 
                  size="small"
                  onClick={() => handleClearQueue('completed')}
                >
                  清空已完成
                </Button>
                <Button 
                  size="small"
                  danger
                  onClick={() => handleClearQueue()}
                >
                  清空全部
                </Button>
              </Space>
            </div>

            {isRunning && stats.processing > 0 && (
              <Alert
                message={`正在处理: ${stats.current?.project_name || ''}`}
                description={
                  <div>
                    <Progress percent={Math.round(stats.current?.progress || 0)} status="active" />
                    <Text type="secondary">{stats.current?.current_step}</Text>
                  </div>
                }
                type="info"
                showIcon
              />
            )}

            <Table
              dataSource={queueList}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              locale={{ 
                emptyText: (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <p>队列为空</p>
                        <Button 
                          type="link" 
                          icon={<PlusOutlined />}
                          onClick={handleBatchUpload}
                        >
                          添加视频开始批量处理
                        </Button>
                      </div>
                    }
                  />
                )
              }}
            />
          </Space>
        </Card>
      </div>
    </Content>
  )
}

export default BatchProcessPage
