import { Redirect } from 'expo-router'
import React from 'react'
import { getToken } from '../lib/api'

export default function Index() {
  return getToken() ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />
}
