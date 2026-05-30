import React, { useState, useEffect } from 'react'
import { Layout, Card, Form, Input, Button, Typography, Space, Alert, Divider, Row, Col, Tabs, message, Select, Tag, Switch, Spin } from 'antd'
import { KeyOutlined, SaveOutlined, ApiOutlined, SettingOutlined, InfoCircleOutlined, UserOutlined, RobotOutlined, SoundOutlined, PoweroffOutlined, SyncOutlined } from '@ant-design/icons'
import { settingsApi } from '../services/api'
import BilibiliManager from '../components/BilibiliManager'
import SpeechRecognitionConfig from '../components/SpeechRecognitionConfig'
import { isDesktopMode, setDesktopMode } from '../utils/desktopMode'
import './SettingsPage.css'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

interface ModelInfo {
  name: string
  display_name: string
  max_tokens?: number
  description?: string
}

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [showBilibiliManager, setShowBilibiliManager] = useState(false)
  const [currentProvider, setCurrentProvider] = useState<any>({})
  const [selectedProvider, setSelectedProvider] = useState('dashscope')
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [modelsFetched, setModelsFetched] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('')

  // 提供商配置
  const providerConfig = {
    dashscope: {
      name: '阿里通义千问',
      icon: <RobotOutlined />,
      color: '#1890ff',
      description: '阿里云通义千问大模型服务',
      apiKeyField: 'dashscope_api_key',
      placeholder: '请输入通义千问API密钥'
    },
    openai: {
      name: 'OpenAI',
      icon: <RobotOutlined />,
      color: '#52c41a',
      description: 'OpenAI GPT系列模型',
      apiKeyField: 'openai_api_key',
      placeholder: '请输入OpenAI API密钥'
    },
    gemini: {
      name: 'Google Gemini',
      icon: <RobotOutlined />,
      color: '#faad14',
      description: 'Google Gemini大模型',
      apiKeyField: 'gemini_api_key',
      placeholder: '请输入Gemini API密钥'
    },
    siliconflow: {
      name: '硅基流动',
      icon: <RobotOutlined />,
      color: '#722ed1',
      description: '硅基流动模型服务',
      apiKeyField: 'siliconflow_api_key',
      placeholder: '请输入硅基流动API密钥'
    },
    sensenova: {
      name: '商汤日日新',
      icon: <RobotOutlined />,
      color: '#ff6b6b',
      description: '商汤日日新大模型服务',
      apiKeyField: 'sensenova_api_key',
      placeholder: '请输入商汤API密钥'
    }
  }

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 首先检查后端是否处于桌面模式
      let desktopModeDetected = await isDesktopMode()
      
      // 如果本地检测不到桌面模式，尝试调用后端 API 检查
      if (!desktopModeDetected) {
        try {
          const response = await settingsApi.checkDesktopMode()
          if (response.is_desktop_mode) {
            // 后端处于桌面模式，设置本地标志
            setDesktopMode(true)
            desktopModeDetected = true
          }
        } catch (error) {
          console.warn('检查桌面模式失败:', error)
        }
      }
      
      if (desktopModeDetected) {
        // Desktop模式：调用完整的API
        const [settings, provider] = await Promise.allSettled([
          settingsApi.getSettings(),
          settingsApi.getCurrentProvider()
        ])
        
        // 检查是否有失败的请求
        const failedRequests = [settings, provider].filter(result => result.status === 'rejected')
        if (failedRequests.length > 0) {
          console.warn('部分API请求失败:', failedRequests.map(r => (r as PromiseRejectedResult).reason))
        }
        
        // 处理设置数据
        const settingsData = settings.status === 'fulfilled' ? settings.value : {}
        
        // 优先使用 settings 中的提供商信息（更可靠）
        const providerFromSettings = settingsData.api?.api_provider || 'dashscope'
        const modelFromSettings = settingsData.api?.api_model || 'qwen-plus'
        
        // 处理提供商数据（作为备用）
        const providerData = provider.status === 'fulfilled'
          ? provider.value
          : { available: false, provider: providerFromSettings, display_name: '未知', model: modelFromSettings }
        const providerName = providerFromSettings // 优先使用 settings 中的提供商
        setCurrentProvider({
          ...providerData,
          provider: providerName,
          model: modelFromSettings
        })
        
        // 将嵌套的settings结构转换为扁平结构
        const flatSettings = {
          llm_provider: providerName,
          dashscope_api_key: settingsData.api?.api_keys?.dashscope || '',
          openai_api_key: settingsData.api?.api_keys?.openai || '',
          gemini_api_key: settingsData.api?.api_keys?.gemini || '',
          siliconflow_api_key: settingsData.api?.api_keys?.siliconflow || '',
          sensenova_api_key: settingsData.api?.api_keys?.sensenova || '',
          jimeng_access_key: settingsData.api?.api_keys?.jimeng_access || '',
          jimeng_secret_key: settingsData.api?.api_keys?.jimeng_secret || '',
          model_name: modelFromSettings,
          chunk_size: settingsData.processing?.processing_chunk_size || 5000,
          min_score_threshold: settingsData.processing?.processing_min_score || 0.5,
          max_clips_per_collection: settingsData.processing?.processing_max_clips || 5,
          api_provider: providerName
        }
        
        setSelectedProvider(providerName)
        setSelectedModel(modelFromSettings)
        
        // 设置表单初始值
        form.setFieldsValue(flatSettings)
        console.log('Desktop模式 - 设置表单值:', flatSettings)
        console.log('当前提供商:', providerData)
        
        // 加载当前提供商的模型列表
        const apiKey = flatSettings[providerConfig[providerName as keyof typeof providerConfig].apiKeyField as keyof typeof flatSettings] as string
        await fetchAvailableModels(providerName, apiKey)
      } else {
        // Web模式：使用默认配置，不调用Desktop API
        console.log('Web模式 - 使用默认配置')
        
        const flatSettings = {
          llm_provider: 'dashscope',
          dashscope_api_key: '',
          openai_api_key: '',
          gemini_api_key: '',
          siliconflow_api_key: '',
          sensenova_api_key: '',
          jimeng_access_key: '',
          jimeng_secret_key: '',
          model_name: 'qwen-plus',
          chunk_size: 5000,
          min_score_threshold: 0.7,
          max_clips_per_collection: 5
        }
        
        setSelectedProvider(providerName)
        form.setFieldsValue(flatSettings)
        
        // 设置当前提供商数据
        setCurrentProvider({
          available: false,
          provider: providerName,
          display_name: providerConfig[providerName as keyof typeof providerConfig]?.name || '未知提供商',
          model: flatSettings.model_name || 'qwen-plus'
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 保存配置
  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      
      console.log('保存配置 - 表单提交的值:', values)
      
      // 检查是否在Desktop模式下运行
      const isDesktop = await isDesktopMode()
      
      if (!isDesktop) {
        // Web模式：只显示提示，不实际保存
        message.info('Web模式下配置无法保存，请在桌面应用中使用完整功能')
        setLoading(false)
        return
      }
      
      // 先获取现有配置，避免清空已有的API key
      let existingSettings = null
      try {
        existingSettings = await settingsApi.getSettings()
      } catch (error) {
        console.warn('获取现有配置失败，将使用默认配置:', error)
      }
      
      console.log('保存配置 - 现有设置:', existingSettings)
      
      // 获取现有的API keys，只更新有值的字段
      const existingApiKeys = existingSettings?.api?.api_keys || {}
      const existingPaths = existingSettings?.paths || {}
      
      // 获取模型值 - 优先使用表单当前值，其次使用提交值，最后使用现有设置
      const currentFormValues = form.getFieldsValue()
      const modelName = currentFormValues.model_name || values.model_name || existingSettings?.api?.api_model || selectedModel || "qwen-plus"
      const llmProvider = currentFormValues.llm_provider || values.llm_provider || existingSettings?.api?.api_provider || "dashscope"
      
      console.log('保存配置 - 最终使用的模型:', modelName)
      console.log('保存配置 - 最终使用的提供商:', llmProvider)
      
      // 转换扁平数据为后端期望的嵌套结构
      const backendSettings = {
        basic: existingSettings?.basic || {
          app_name: "AutoClip Desktop",
          app_version: "1.0.0",
          debug_mode: false,
          auto_start: true
        },
        service: existingSettings?.service || {
          host: "127.0.0.1",
          port: 8000,
          max_memory_usage: 2048
        },
        api: {
          api_keys: {
            dashscope: values.dashscope_api_key || existingApiKeys.dashscope || "",
            openai: values.openai_api_key || existingApiKeys.openai || "",
            gemini: values.gemini_api_key || existingApiKeys.gemini || "",
            siliconflow: values.siliconflow_api_key || existingApiKeys.siliconflow || "",
            sensenova: values.sensenova_api_key || existingApiKeys.sensenova || "",
            jimeng_access: values.jimeng_access_key || existingApiKeys.jimeng_access || "",
            jimeng_secret: values.jimeng_secret_key || existingApiKeys.jimeng_secret || ""
          },
          api_provider: llmProvider,
          api_model: modelName,
          api_max_tokens: existingSettings?.api?.api_max_tokens || 4096,
          api_timeout: existingSettings?.api?.api_timeout || 30
        },
        processing: {
          processing_chunk_size: values.chunk_size || existingSettings?.processing?.processing_chunk_size || 5000,
          processing_min_score: values.min_score_threshold || existingSettings?.processing?.processing_min_score || 0.5,
          processing_max_clips: values.max_clips_per_collection || existingSettings?.processing?.processing_max_clips || 5,
          processing_max_retries: existingSettings?.processing?.processing_max_retries || 3
        },
        logs: existingSettings?.logs || {
          log_level: "INFO",
          log_retention_days: 7
        },
        paths: existingPaths || {
          data_directory: "C:\\\\Users\\\\Liuyanbo\\\\Library\\\\Application Support\\\\AutoClip",
          cache_directory: "C:\\\\Users\\\\Liuyanbo\\\\Library\\\\Application Support\\\\AutoClip\\\\cache",
          temp_directory: "C:\\\\Users\\\\Liuyanbo\\\\Library\\\\Application Support\\\\AutoClip\\\\temp"
        }
      }
      
      await settingsApi.updateSettings(backendSettings)
      message.success('配置保存成功！')
      await loadData() // 重新加载数据
    } catch (error: any) {
      message.error('保存失败: ' + (error.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  // 测试API密钥
  const handleTestApiKey = async () => {
    const apiKey = form.getFieldValue(providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField)
    
    if (!apiKey || apiKey.trim() === '') {
      message.error('请先输入API密钥')
      return
    }

    try {
      setLoading(true)
      const result = await settingsApi.testApiKey(selectedProvider, apiKey)
      if (result.success) {
        message.success('API密钥测试成功！')
      } else {
        message.error('API密钥测试失败: ' + (result.error || '未知错误'))
      }
    } catch (error: any) {
      message.error('测试失败: ' + (error.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  // 获取可用模型列表
  const fetchAvailableModels = async (provider: string, apiKey?: string) => {
    setModelsLoading(true)
    try {
      const result = await settingsApi.getAvailableModels(provider, apiKey)
      if (result.models && result.models.length > 0) {
        setAvailableModels(result.models)
      } else {
        // 如果没有获取到模型列表，使用预设列表
        setAvailableModels(getDefaultModels(provider))
      }
      setModelsFetched(true)
    } catch (error) {
      console.warn('获取模型列表失败，使用预设列表:', error)
      setAvailableModels(getDefaultModels(provider))
      setModelsFetched(true)
    } finally {
      setModelsLoading(false)
    }
  }

  // 获取提供商的预设模型列表
  const getDefaultModels = (provider: string): ModelInfo[] => {
    const defaultModels: Record<string, ModelInfo[]> = {
      dashscope: [
        { name: 'qwen-plus', display_name: '通义千问增强版', max_tokens: 8192, description: '适合复杂推理和创作任务' },
        { name: 'qwen-turbo', display_name: '通义千问标准版', max_tokens: 8192, description: '平衡性能和成本' },
        { name: 'qwen-max', display_name: '通义千问旗舰版', max_tokens: 8192, description: '最强性能，适合复杂任务' },
        { name: 'qwen-long', display_name: '通义千问长文本版', max_tokens: 100000, description: '支持超长文本处理' }
      ],
      openai: [
        { name: 'gpt-4o', display_name: 'GPT-4 Omni', max_tokens: 128000, description: '最新多模态模型' },
        { name: 'gpt-4o-mini', display_name: 'GPT-4 Omni Mini', max_tokens: 128000, description: '轻量级多模态模型' },
        { name: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', max_tokens: 128000, description: '高性能版本' },
        { name: 'gpt-4', display_name: 'GPT-4', max_tokens: 8192, description: '经典版本' },
        { name: 'gpt-3.5-turbo', display_name: 'GPT-3.5 Turbo', max_tokens: 16384, description: '经济实用版本' }
      ],
      gemini: [
        { name: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', max_tokens: 2000000, description: '最新专业版' },
        { name: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', max_tokens: 1000000, description: '快速响应版本' },
        { name: 'gemini-pro', display_name: 'Gemini Pro', max_tokens: 30720, description: '经典专业版' }
      ],
      siliconflow: [
        { name: 'deepseek-chat', display_name: 'DeepSeek Chat', max_tokens: 32768, description: '深度求索对话模型' },
        { name: 'deepseek-coder', display_name: 'DeepSeek Coder', max_tokens: 16384, description: '代码生成专用模型' },
        { name: 'Qwen/Qwen2.5-14B-Instruct', display_name: 'Qwen2.5-14B', max_tokens: 8192, description: '通义千问2.5版本' },
        { name: 'Qwen/Qwen2-7B-Instruct', display_name: 'Qwen2-7B', max_tokens: 8192, description: '通义千问2.0版本' }
      ],
      sensenova: [
        { name: 'sensenova-lite', display_name: '日日新 Lite', max_tokens: 8192, description: '轻量版模型，响应快速' },
        { name: 'sensenova-pro', display_name: '日日新 Pro', max_tokens: 16384, description: '专业版模型，性能均衡' },
        { name: 'sensenova-plus', display_name: '日日新 Plus', max_tokens: 32768, description: '增强版模型，适合复杂任务' }
      ]
    }
    return defaultModels[provider] || []
  }

  // 提供商切换
  const handleProviderChange = async (provider: string) => {
    setSelectedProvider(provider)
    setSelectedModel('') // 切换提供商时清空模型选择
    form.setFieldsValue({ llm_provider: provider, model_name: '' })
    // 清空之前的模型，触发重新获取
    setAvailableModels([])
    setModelsFetched(false)
    // 立即加载新提供商的模型
    const apiKey = form.getFieldValue(providerConfig[provider as keyof typeof providerConfig].apiKeyField)
    await fetchAvailableModels(provider, apiKey)
  }

  // 刷新模型列表
  const handleRefreshModels = async () => {
    const apiKey = form.getFieldValue(providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField)
    await fetchAvailableModels(selectedProvider, apiKey)
  }

  return (
    <Content className="settings-page">
      <div className="settings-container">
        <Title level={2} className="settings-title">
          <SettingOutlined /> 系统设置
        </Title>
        
        <Tabs defaultActiveKey="api" className="settings-tabs">
          <TabPane tab="AI 模型配置" key="api">
            <Card title="AI 模型配置" className="settings-card">
              <Alert
                message="多模型提供商支持"
                description="系统现在支持多个AI模型提供商，您可以根据需要选择不同的服务商和模型。"
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <Form
                form={form}
                layout="vertical"
                className="settings-form"
                onFinish={handleSave}
              >
                {/* 当前提供商状态 */}
                {currentProvider.available && (
                  <Alert
                    message={`当前使用: ${currentProvider.display_name} - ${currentProvider.model}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {/* 提供商选择 */}
                <Form.Item
                  label="选择AI模型提供商"
                  name="llm_provider"
                  className="form-item"
                  rules={[{ required: true, message: '请选择AI模型提供商' }]}
                >
                  <Select
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    className="settings-input"
                    placeholder="请选择AI模型提供商"
                  >
                    {Object.entries(providerConfig).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <Space>
                          <span style={{ color: config.color }}>{config.icon}</span>
                          <span>{config.name}</span>
                          <Tag color={config.color}>{config.description}</Tag>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 动态API密钥输入 */}
                <Form.Item
                  label={`${providerConfig[selectedProvider as keyof typeof providerConfig].name} API Key`}
                  name={providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField}
                  className="form-item"
                  rules={[
                    { required: true, message: '请输入API密钥' },
                    { min: 10, message: 'API密钥长度不能少于10位' }
                  ]}
                >
                  <Input.Password
                    placeholder={providerConfig[selectedProvider as keyof typeof providerConfig].placeholder}
                    prefix={<KeyOutlined />}
                    className="settings-input"
                  />
                </Form.Item>

                {/* 模型选择 - 动态获取版本 */}
                <Form.Item
                  label="选择模型"
                  name="model_name"
                  className="form-item"
                  rules={[{ required: true, message: '请输入或选择模型名称' }]}
                  extra={
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        当前提供商: {providerConfig[selectedProvider as keyof typeof providerConfig]?.name}
                      </Text>
                    </div>
                  }
                >
                  <div style={{ position: 'relative' }}>
                    <Select
                      value={selectedModel || undefined}
                      className="settings-input"
                      placeholder={modelsLoading ? '加载中...' : '请选择或输入模型名称'}
                      showSearch
                      allowClear
                      notFoundContent={modelsLoading ? <Spin size="small" /> : '暂无可用模型'}
                      onChange={(value) => {
                        console.log('模型选择变更:', value)
                        setSelectedModel(value || '')
                        form.setFieldsValue({ model_name: value || '' })
                      }}
                      onDropdownVisibleChange={(visible) => {
                        if (visible && !modelsFetched) {
                          const apiKey = form.getFieldValue(providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField)
                          fetchAvailableModels(selectedProvider, apiKey)
                        }
                      }}
                    >
                      {availableModels.length > 0 ? (
                        <>
                          {/* 始终显示当前已保存的模型作为选项（即使不在预设列表中） */}
                          {(() => {
                            const displayModel = selectedModel || form.getFieldValue('model_name')
                            if (displayModel && !availableModels.some(m => m.name === displayModel)) {
                              return (
                                <Select.OptGroup label="当前选择">
                                  <Select.Option 
                                    key={displayModel} 
                                    value={displayModel}
                                    title={`已保存的模型: ${displayModel}`}
                                  >
                                    <div>
                                      <span>{displayModel}</span>
                                      <Tag color="orange" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                        已保存
                                      </Tag>
                                    </div>
                                  </Select.Option>
                                </Select.OptGroup>
                              )
                            }
                            return null
                          })()}
                          <Select.OptGroup label={`${providerConfig[selectedProvider as keyof typeof providerConfig]?.name} 可用模型`}>
                            {availableModels.map((model) => (
                              <Select.Option 
                                key={model.name} 
                                value={model.name}
                                title={model.description}
                              >
                                <div>
                                  <span>{model.name}</span>
                                  {model.display_name && model.display_name !== model.name && (
                                    <span style={{ marginLeft: '8px', color: '#8c8c8c', fontSize: '12px' }}>
                                      ({model.display_name})
                                    </span>
                                  )}
                                  {model.max_tokens && (
                                    <Tag color="default" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                      Max: {model.max_tokens.toLocaleString()}
                                    </Tag>
                                  )}
                                </div>
                              </Select.Option>
                            ))}
                          </Select.OptGroup>
                        </>
                      ) : modelsLoading ? (
                        <Select.Option value="" disabled>
                          <Spin size="small" /> 加载中...
                        </Select.Option>
                      ) : (
                        <Select.Option value="" disabled>
                          暂无可用模型，请点击刷新按钮获取
                        </Select.Option>
                      )}
                    </Select>
                    <Button
                      type="text"
                      icon={<SyncOutlined />}
                      onClick={handleRefreshModels}
                      loading={modelsLoading}
                      style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        padding: '4px 8px'
                      }}
                      title="刷新模型列表"
                    />
                  </div>
                </Form.Item>

                <Form.Item className="form-item">
                  <Space>
                    <Button
                      type="default"
                      icon={<ApiOutlined />}
                      className="test-button"
                      onClick={handleTestApiKey}
                      loading={loading}
                    >
                      测试连接
                    </Button>
                  </Space>
                </Form.Item>

                <Divider className="settings-divider" />

                <Title level={4} className="section-title">模型配置</Title>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="文本分块大小"
                      name="chunk_size"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5000" 
                        addonAfter="字符" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="最低评分阈值"
                      name="min_score_threshold"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="1" 
                        placeholder="0.7" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="每个合集最大切片数"
                      name="max_clips_per_collection"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5" 
                        addonAfter="个" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item className="form-item">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    size="large"
                    className="save-button"
                    loading={loading}
                  >
                    保存配置
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="使用说明" className="settings-card">
              <Space direction="vertical" size="large" className="instructions-space">
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 1. 选择AI模型提供商
                  </Title>
                  <Paragraph className="instruction-text">
                    系统支持多个AI模型提供商：
                    <br />• <Text strong>阿里通义千问</Text>：访问阿里云控制台获取API密钥
                    <br />• <Text strong>OpenAI</Text>：访问 platform.openai.com 获取API密钥
                    <br />• <Text strong>Google Gemini</Text>：访问 ai.google.dev 获取API密钥
                    <br />• <Text strong>硅基流动</Text>：访问 docs.siliconflow.cn 获取API密钥
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 2. 配置参数说明
                  </Title>
                  <Paragraph className="instruction-text">
                    • <Text strong>文本分块大小</Text>：影响处理速度和精度，建议5000字符<br />
                    • <Text strong>评分阈值</Text>：只有高于此分数的片段才会被保留<br />
                    • <Text strong>合集切片数</Text>：控制每个主题合集包含的片段数量
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 3. 测试连接
                  </Title>
                  <Paragraph className="instruction-text">
                    保存前建议先测试API密钥是否有效，确保服务正常运行
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SoundOutlined />
                语音转写配置
              </span>
            } 
            key="speech"
          >
            <Card title="语音转写配置" className="settings-card">
              <Alert
                message="语音识别服务配置"
                description="配置语音转写服务，用于视频字幕生成和语音识别。支持本地Whisper模型和多种云服务API。"
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <SpeechRecognitionConfig
                onConfigChange={(config) => {
                  console.log('语音配置已更新:', config)
                  // 移除重复的成功提示，SpeechRecognitionConfig内部已经处理
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                应用设置
              </span>
            } 
            key="app"
          >
            <Card title="应用设置" className="settings-card">
              <Alert
                message="应用行为配置"
                description="配置应用的启动行为和系统集成选项。"
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <AppSettings />
            </Card>
          </TabPane>

          <TabPane tab="B站管理" key="bilibili">
            <Card title="B站账号管理" className="settings-card">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  <Title level={3} style={{ color: '#ffffff', margin: '0 0 8px 0' }}>
                    B站账号管理
                  </Title>
                  <Text type="secondary" style={{ color: '#b0b0b0', fontSize: '16px' }}>
                    管理您的B站账号，支持多账号切换和快速投稿
                  </Text>
                </div>
                
                <Space size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserOutlined />}
                    onClick={() => message.info('开发中，敬请期待', 3)}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, #1890ff, #36cfc9)',
                      border: 'none',
                      fontWeight: 500,
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '16px'
                    }}
                  >
                    管理B站账号
                  </Button>
                </Space>
                
                <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '600px', margin: '32px auto 0' }}>
                  <Title level={4} style={{ color: '#ffffff', marginBottom: '16px' }}>
                    功能特点
                  </Title>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#1890ff' }}>多账号支持</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        支持添加多个B站账号，方便管理和切换
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#52c41a' }}>安全登录</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        使用Cookie导入，避免风控，安全可靠
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#faad14' }}>快速投稿</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        在切片详情页直接选择账号投稿，操作简单
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#722ed1' }}>批量管理</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        支持批量上传多个切片，提高效率
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>

        {/* B站管理弹窗 */}
        <BilibiliManager
          visible={showBilibiliManager}
          onClose={() => setShowBilibiliManager(false)}
          onUploadSuccess={() => {
            message.success('操作成功')
          }}
        />
      </div>
    </Content>
  )
}

// 应用设置组件
const AppSettings: React.FC = () => {
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAutostartStatus()
  }, [])

  const checkAutostartStatus = async () => {
    try {
      const isDesktop = await isDesktopMode()
      if (isDesktop) {
        const { invoke } = await import('@tauri-apps/api/core')
        const enabled = await invoke('is_autostart_enabled')
        setAutostartEnabled(Boolean(enabled))
      }
    } catch (error) {
      console.error('检查自动启动状态失败:', error)
    }
  }

  const handleAutostartToggle = async (enabled: boolean) => {
    const isDesktop = await isDesktopMode()
    if (!isDesktop) {
      message.error('此功能仅在桌面应用中可用')
      return
    }

    setLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      if (enabled) {
        await invoke('enable_autostart')
        message.success('已启用自动启动')
      } else {
        await invoke('disable_autostart')
        message.success('已禁用自动启动')
      }
      
      setAutostartEnabled(enabled)
    } catch (error) {
      console.error('切换自动启动状态失败:', error)
      message.error(`操作失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            size="small" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid #404040',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <PoweroffOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong style={{ color: '#ffffff' }}>开机自动启动</Text>
                </div>
                <Text type="secondary" style={{ color: '#b0b0b0' }}>
                  启用后，应用将在系统启动时自动运行
                </Text>
              </div>
              <Switch
                checked={autostartEnabled}
                onChange={handleAutostartToggle}
                loading={loading}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </div>
          </Card>
        </Col>
      </Row>
      
      <Alert
        message="提示"
        description="自动启动功能仅在桌面应用中可用。启用后，应用将在系统启动时自动运行，您可以通过系统托盘图标访问应用。"
        type="info"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </div>
  )
}

export default SettingsPage
