import { SettingsSidebar } from './_components/SettingsSidebar'
import { SettingsMobileBar } from './_components/SettingsMobileBar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <SettingsSidebar />
      <div className="flex-1 min-w-0">
        <SettingsMobileBar />
        {children}
      </div>
    </div>
  )
}
