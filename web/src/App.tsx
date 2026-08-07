import { useEffect, useState } from 'react'
import { getToken } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useHash, safeDec } from '@/lib/router'
import { Layout, activeKey } from '@/components/Layout'
import { ToastHost, ConfirmHost, PageSkeleton } from '@/components/ui'
import { AuthPage, ResetPage } from '@/pages/Auth'
import { HomePage, HomeRail } from '@/pages/Home'
import { RealPage, BrowsePage, SearchPage, RealFavsPage, RandStart, YearStart } from '@/pages/Real'
import { ExamPage } from '@/pages/Exam'
import { ResultPage } from '@/pages/Result'
import { WrongPage, PracticePage } from '@/pages/Wrong'
import { SubjPage, SubjListPage } from '@/pages/Subj'
import { HistoryPage } from '@/pages/History'
import { AccountPage } from '@/pages/Account'
import { MaterialPage } from '@/pages/Material'
import { SprintPage } from '@/pages/Sprint'

export default function App() {
  const { me, loadMe } = useApp()
  const hash = useHash()
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    loadMe().finally(() => setBooted(true))
  }, [loadMe])

  const resetM = hash.match(/^reset-([0-9a-f]{48})$/)
  if (resetM) {
    return (
      <>
        <ResetPage token={resetM[1]} />
        <ToastHost />
      </>
    )
  }

  if (!booted)
    return (
      <div className="mx-auto max-w-3xl px-4">
        <PageSkeleton />
      </div>
    )

  if (!getToken() || !me) {
    return (
      <>
        <AuthPage />
        <ToastHost />
        <ConfirmHost />
      </>
    )
  }

  let page: React.ReactNode
  let rail: React.ReactNode = null
  let m: RegExpMatchArray | null = null
  let fullscreen = false

  if ((m = hash.match(/^exam\/(\d+)$/))) {
    page = <ExamPage key={m[1]} pid={+m[1]} />
    fullscreen = true
  } else if ((m = hash.match(/^result\/(\d+)$/))) {
    page = <ResultPage key={m[1]} pid={+m[1]} />
  } else if ((m = hash.match(/^realbrowse\/(\d{4})$/))) {
    page = <BrowsePage key={m[1]} year={+m[1]} />
  } else if ((m = hash.match(/^realyear\/(\d{4})$/))) {
    page = <YearStart key={m[1]} year={+m[1]} />
  } else if ((m = hash.match(/^realsubj\/(\d{4})(?:-(\d{1,2}))?$/))) {
    page = <SubjPage key={hash} year={+m[1]} seq={m[2] ? +m[2] : undefined} />
  } else if (hash === 'realsubjlist' || hash === 'realsubj') {
    page = <SubjListPage />
  } else if ((m = hash.match(/^realsearch\/(.+)$/))) {
    page = <SearchPage key={m[1]} q0={safeDec(m[1])} />
  } else if (hash === 'realfavs') {
    page = <RealFavsPage />
  } else if (hash === 'realrand') {
    page = <RandStart />
  } else if (hash === 'real' || hash.startsWith('real')) {
    page = <RealPage />
  } else if (hash === 'sprint72') {
    page = <SprintPage />
  } else if (hash === 'wrong') {
    page = <WrongPage />
  } else if (hash === 'practice') {
    page = <PracticePage />
  } else if (hash === 'history') {
    page = <HistoryPage />
  } else if (hash === 'account') {
    page = <AccountPage />
  } else if ((m = hash.match(/^material\/(\d+)$/))) {
    page = <MaterialPage key={m[1]} id={+m[1]} />
  } else {
    page = <HomePage />
    rail = <HomeRail />
  }

  if (fullscreen)
    return (
      <>
        {page}
        <ToastHost />
        <ConfirmHost />
      </>
    )

  return (
    <>
      <Layout active={activeKey(hash)} rail={rail}>
        {page}
      </Layout>
      <ToastHost />
      <ConfirmHost />
    </>
  )
}
