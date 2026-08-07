import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, setToken, setUser, toast } from '../../api'
import './index.scss'
import { usePageTheme } from '../../theme'

export default function Login() {
  const theme = usePageTheme()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) return toast('请填写邮箱和密码')
    if (password.length < 6) return toast('密码至少 6 位')
    setLoading(true)
    try {
      const r = mode === 'login' ? await api.login(email, password) : await api.register(email, password)
      setToken(r.token)
      setUser(r.user)
      Taro.redirectTo({ url: '/pages/home/index' })
    } catch (e: any) {
      toast(e.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className={`login-page ${theme}`}>
      <View className='login-hero'>
        <View className='login-logo'>真</View>
        <Text className='login-title'>真题工坊</Text>
        <Text className='login-sub'>考研政治历年真题 · 免费判分</Text>
      </View>
      <View className='card login-card'>
        <View className='login-tabs'>
          <View className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>登录</View>
          <View className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>注册</View>
        </View>
        <View className='login-field'>
          <Text className='login-label'>邮箱</Text>
          <Input className='login-input' type='text' placeholder='you@example.com' value={email} onInput={e => setEmail(e.detail.value)} />
        </View>
        <View className='login-field'>
          <Text className='login-label'>密码</Text>
          <Input className='login-input' password placeholder='至少 6 位' value={password} onInput={e => setPassword(e.detail.value)} />
        </View>
        <View className={`btn-primary login-submit ${loading ? 'disabled' : ''}`} onClick={loading ? undefined : submit}>
          {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
        </View>
        <Text className='login-tip text-xs text-3'>
          {mode === 'login' ? '还没有账号？切到「注册」，30 秒开刷' : '注册即表示同意用户协议与隐私政策'}
        </Text>
      </View>
    </View>
  )
}
