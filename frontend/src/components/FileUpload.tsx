import React, { useState, useEffect } from 'react'
import { Button, message, Space, Typography, Input, Progress, List, Tag, Alert } from 'antd'
import { InboxOutlined, VideoCameraOutlined, FileTextOutlined, SubnodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useDropzone } from 'react-dropzone'
import { projectApi, VideoCategory } from '../services/api'
import { useProjectStore } from '../store/useProjectStore'
import { validateApiConfigBeforeProjectCreation } from '../utils/apiConfigCheck'

const { Text } = Typography

interface FileUploadProps {
  onUploadSuccess?: () => void
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    total: number,
    success: number,
    failed: number,
    results: Array<{ success: boolean, project_id: string, project_name: string, video_file: string }>,
    errors: Array<{ success: boolean, video_file: string, error: string }>
  } | null>(null)
  const { addProject } = useProjectStore()

  // 加载视频分类配置
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await projectApi.getVideoCategories()
        setCategories(response.categories)
        if (response.default_category) {
          setSelectedCategory(response.default_category)
        } else if (response.categories.length > 0) {
          setSelectedCategory(response.categories[0].value)
        }
      } catch (error) {
        console.error('Failed to load video categories:', error)
      }
    }

    loadCategories()
  }, [])

  const onDrop = (acceptedFiles: File[]) => {
    const validVideoFiles = acceptedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')
    })

    if (validVideoFiles.length > 0) {
      if (validVideoFiles.length > 1) {
        setBatchMode(true)
        setVideoFiles(validVideoFiles)
      } else {
        setBatchMode(false)
        setVideoFiles(validVideoFiles)
      }
      setUploadResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    },
    multiple: true
  })

  const handleSingleUpload = async (file: File) => {
    const hasValidConfig = await validateApiConfigBeforeProjectCreation()
    if (!hasValidConfig) {
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev >= 85 ? prev : prev + Math.max(1, Math.floor((90 - prev) / 10)))
      }, 300)

      const projectName = file.name.replace(/\.[^/.]+$/, '')
      const newProject = await projectApi.uploadFiles({
        video_file: file,
        project_name: projectName,
        video_category: selectedCategory
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
      addProject(newProject)
      message.success('项目创建成功！正在后台处理中，请稍候...')
      
      setVideoFiles([])
      setUploadProgress(0)
      setUploading(false)
      
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error: any) {
      console.error('上传失败，详细错误:', error)
      
      let errorMessage = '上传失败，请重试'
      let errorType = 'error'

      if (error.response?.status === 413) {
        errorMessage = '文件太大，请选择较小的视频文件'
        errorType = 'warning'
      } else if (error.response?.status === 415) {
        errorMessage = '不支持的文件格式，请选择MP4、AVI、MOV、MKV或WEBM格式的视频'
        errorType = 'warning'
      } else if (error.response?.status === 400) {
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail
        } else {
          errorMessage = '文件格式或内容有问题，请检查后重试'
        }
      } else if (error.response?.status === 500) {
        errorMessage = '服务器处理文件时出错，请稍后重试'
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '上传超时，请检查网络连接后重试'
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.userMessage) {
        errorMessage = error.userMessage
      } else if (error.message) {
        errorMessage = error.message
      }

      if (errorType === 'warning') {
        message.warning(errorMessage)
      } else {
        message.error(errorMessage)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleBatchUpload = async () => {
    if (videoFiles.length === 0) {
      message.warning('请先选择视频文件')
      return
    }

    const hasValidConfig = await validateApiConfigBeforeProjectCreation()
    if (!hasValidConfig) {
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev >= 85 ? prev : prev + Math.max(1, Math.floor((90 - prev) / 10)))
      }, 300)

      const result = await projectApi.uploadBatchFiles(videoFiles, selectedCategory)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadResult(result)

      result.results.forEach(item => {
        if (item.success) {
          const mockProject = {
            id: item.project_id,
            name: item.project_name,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            total_clips: 0,
            total_collections: 0
          }
          addProject(mockProject)
        }
      })

      const successMessage = `成功创建 ${result.success} 个项目`
      if (result.failed > 0) {
        message.warning(`${successMessage}，有 ${result.failed} 个项目创建失败`)
      } else {
        message.success(successMessage + '！项目正在后台处理中')
      }

      setUploadProgress(0)
      setUploading(false)
      
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error: any) {
      console.error('批量上传失败，详细错误:', error)
      message.error('批量上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index))
    if (videoFiles.length <= 1) {
      setBatchMode(false)
    }
  }

  const clearAll = () => {
    setVideoFiles([])
    setBatchMode(false)
    setUploadResult(null)
  }

  return (
    <div style={{
      borderRadius: '16px',
      padding: '0',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      margin: '0 auto'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(79, 172, 254, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {videoFiles.length === 0 && (
        <div 
          {...getRootProps()} 
          className={`upload-area ${isDragActive ? 'dragover' : ''}`}
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            marginBottom: '16px',
            background: isDragActive ? 'rgba(79, 172, 254, 0.15)' : 'rgba(38, 38, 38, 0.6)',
            border: `2px dashed ${isDragActive ? '#4facfe' : 'rgba(79, 172, 254, 0.3)'}`,
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            backdropFilter: 'blur(10px)'
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            background: isDragActive ? 'rgba(79, 172, 254, 0.3)' : 'rgba(79, 172, 254, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(79, 172, 254, 0.2)'
          }}>
            <InboxOutlined style={{ 
              fontSize: '20px', 
              color: isDragActive ? '#4facfe' : '#4facfe'
            }} />
          </div>
          <div>
            <Text strong style={{ 
              color: '#ffffff',
              fontSize: '16px',
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              {isDragActive ? '松开鼠标导入文件' : '点击或拖拽文件到此区域'}
            </Text>
            <Text style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.5' }}>
              支持 MP4、AVI、MOV、MKV、WEBM 格式，<Text style={{ color: '#52c41a', fontWeight: 600 }}>可以同时选择多个视频进行批量处理</Text>
            </Text>
          </div>
        </div>
      )}

      {/* 视频分类选择 */}
      {videoFiles.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ color: '#ffffff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
            视频分类
          </Text>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {categories.map(category => {
              const isSelected = selectedCategory === category.value
              return (
                <div
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: isSelected 
                      ? `2px solid ${category.color}` 
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected 
                      ? `${category.color}25` 
                      : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                    boxShadow: isSelected 
                      ? `0 0 12px ${category.color}40` 
                      : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 400,
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 已选择文件列表 */}
      {videoFiles.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text strong style={{ color: '#ffffff', fontSize: '14px' }}>
              已选择 {videoFiles.length} 个文件
            </Text>
            {!uploading && (
              <Button type="link" size="small" onClick={clearAll} style={{ color: '#ff6b6b' }}>
                清空所有
              </Button>
            )}
          </div>
          <List
            dataSource={videoFiles}
            renderItem={(file, index) => (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(38, 38, 38, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(79, 172, 254, 0.2)',
                backdropFilter: 'blur(10px)',
                marginBottom: '8px'
              }}>
                <Space size="middle">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
                  }}>
                    <VideoCameraOutlined style={{ color: '#ffffff', fontSize: '16px' }} />
                  </div>
                  <div>
                    <Text style={{ color: '#ffffff', fontWeight: 600, display: 'block', fontSize: '14px' }}>
                      {file.name}
                    </Text>
                    <Text style={{ color: '#cccccc', fontSize: '13px' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </div>
                </Space>
                {!uploading && (
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => removeFile(index)}
                    style={{ 
                      color: '#ff6b6b',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      fontSize: '12px'
                    }}
                  >
                    移除
                  </Button>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* AI字幕生成提示 */}
      {videoFiles.length > 0 && !uploading && !uploadResult && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(82, 196, 26, 0.1)',
          border: '1px solid rgba(82, 196, 26, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <SubnodeOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
          <Text style={{ color: '#52c41a', fontSize: '14px', fontWeight: 500 }}>
            将使用AI语音识别自动生成字幕文件
          </Text>
        </div>
      )}

      {/* 上传进度 */}
      {uploading && (
        <div style={{ 
          marginBottom: '16px',
          padding: '20px',
          background: 'rgba(38, 38, 38, 0.8)',
          borderRadius: '16px',
          border: '1px solid rgba(79, 172, 254, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>导入进度</Text>
            <Text style={{ color: '#4facfe', float: 'right', fontWeight: 600, fontSize: '14px' }}>
              {uploadProgress}%
            </Text>
          </div>
          <Progress 
            percent={uploadProgress} 
            status="active"
            strokeColor={{
              '0%': '#4facfe',
              '100%': '#00f2fe',
            }}
            trailColor="#404040"
            strokeWidth={6}
            showInfo={false}
            style={{ marginBottom: '8px' }}
          />
          <Text style={{ color: '#cccccc', fontSize: '13px', marginTop: '8px', display: 'block', textAlign: 'center' }}>
            正在导入文件，请稍候...
          </Text>
        </div>
      )}

      {/* 批量上传结果 */}
      {uploadResult && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message={`处理完成：成功 ${uploadResult.success} 个，失败 ${uploadResult.failed} 个`}
            type={uploadResult.failed === 0 ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: '12px' }}
          />
          
          {uploadResult.errors.length > 0 && (
            <List
              dataSource={uploadResult.errors}
              renderItem={(error) => (
                <List.Item>
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <Text strong>{error.video_file}</Text>
                    <Text type="secondary">{error.error}</Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>
      )}

      {/* 上传按钮 */}
      {videoFiles.length > 0 && !uploading && !uploadResult && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <Space>
            {videoFiles.length === 1 ? (
              <Button 
                type="primary" 
                size="large"
                loading={uploading}
                onClick={() => handleSingleUpload(videoFiles[0])}
                style={{
                  height: '48px',
                  padding: '0 32px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(79, 172, 254, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                开始导入并处理
              </Button>
            ) : (
              <Button 
                type="primary" 
                size="large"
                loading={uploading}
                onClick={handleBatchUpload}
                style={{
                  height: '48px',
                  padding: '0 32px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(79, 172, 254, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                批量导入 {videoFiles.length} 个视频
              </Button>
            )}
            <Button 
              size="large"
              onClick={clearAll}
              style={{
                height: '48px',
                padding: '0 32px',
                borderRadius: '24px',
              }}
            >
              重新选择
            </Button>
          </Space>
        </div>
      )}

      {/* 处理完成后重新开始按钮 */}
      {uploadResult && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <Button 
            size="large"
            onClick={() => {
              clearAll()
            }}
            style={{
              height: '48px',
              padding: '0 32px',
              borderRadius: '24px',
            }}
          >
            继续导入其他视频
          </Button>
        </div>
      )}
    </div>
  )
}

export default FileUpload
