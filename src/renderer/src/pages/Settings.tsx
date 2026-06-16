function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-700 last:border-0">
      <div className="mr-8">
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

export default function Settings() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">App configuration and preferences</p>
      </div>

      <SettingSection title="FFmpeg">
        <SettingRow label="FFmpeg binary path" description="Path to the ffmpeg executable">
          <input
            className="w-64 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-500"
            placeholder="/usr/local/bin/ffmpeg"
            readOnly
          />
        </SettingRow>
        <SettingRow label="FFprobe binary path" description="Path to the ffprobe executable">
          <input
            className="w-64 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-500"
            placeholder="/usr/local/bin/ffprobe"
            readOnly
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Storage">
        <SettingRow label="Temp directory" description="Where rendered videos are written before upload">
          <input
            className="w-64 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-500"
            placeholder="appData/temp/renders"
            readOnly
          />
        </SettingRow>
        <SettingRow label="Auto-delete after upload" description="Remove rendered file once upload succeeds">
          <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="OAuth">
        <SettingRow label="Google OAuth Client ID" description="From Google Cloud Console (YouTube Data API v3)">
          <input
            className="w-64 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-500"
            placeholder="Not configured"
            readOnly
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
