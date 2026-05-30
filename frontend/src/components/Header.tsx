import React from 'react'
import { Layout, Button } from 'antd'
import { SettingOutlined, HomeOutlined, PlaySquareOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header: AntHeader } = Layout

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const isBatchPage = location.pathname === '/batch'

  return (
    <AntHeader 
      className="glass-effect"
      style={{ 
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        background: 'rgba(26, 26, 26, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Logo */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          gap: '24px'
        }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <span
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            letterSpacing: '-0.5px'
          }}
        >
          AutoClip
        </span>
        
        {/* 导航链接 */}
        {!isHomePage && (
          <Button 
            type="text"
            icon={<HomeOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              navigate('/')
            }}
            style={{
              background: 'transparent',
              border: 'none',
              height: '36px',
              padding: '0 16px',
              fontWeight: 500,
              color: '#ffffff'
            }}
          >
            首页
          </Button>
        )}
        
        <Button 
          type="text"
          icon={<PlaySquareOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            navigate('/batch')
          }}
          style={{
            background: isBatchPage ? 'rgba(24, 144, 255, 0.2)' : 'transparent',
            border: isBatchPage ? '1px solid rgba(24, 144, 255, 0.5)' : 'none',
            height: '36px',
            padding: '0 16px',
            fontWeight: 500,
            color: isBatchPage ? '#1890ff' : '#ffffff'
          }}
        >
          批量处理
        </Button>
      </div>
      
      {/* Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          type="text" 
          icon={<SettingOutlined />}
          onClick={() => navigate('/settings')}
          style={{
            color: '#cccccc',
            border: '1px solid transparent',
            borderRadius: '8px',
            height: '40px',
            padding: '0 16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2d2d2d'
            e.currentTarget.style.borderColor = '#404040'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          设置
        </Button>
      </div>
    </AntHeader>
  )
}

export default Header
