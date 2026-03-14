import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Monitor, Apple, Terminal, Copy, Check, Download } from "lucide-react";
import { PageLayout } from "@/components/marketing/PageLayout";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { CodeBlock } from "@/components/marketing/CodeBlock";
import { CTASection } from "@/components/marketing/CTASection";

type Platform = "windows" | "mac" | "linux" | "unknown";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

const DESKTOP_DOWNLOADS = [
  {
    platform: "windows" as Platform,
    icon: <Monitor className="w-5 h-5" />,
    label: "Windows",
    file: "Jaibber_{version}_x64-setup.exe",
    note: "Windows 10+ (64-bit)",
  },
  {
    platform: "mac" as Platform,
    icon: <Apple className="w-5 h-5" />,
    label: "macOS",
    file: "Jaibber_{version}_x64.dmg",
    note: "macOS 11+ (Intel & Apple Silicon)",
  },
  {
    platform: "linux" as Platform,
    icon: <Terminal className="w-5 h-5" />,
    label: "Linux",
    file: "Jaibber_{version}_amd64.AppImage",
    note: "AppImage (64-bit)",
  },
];

const GITHUB_RELEASES_URL = "https://github.com/tmugavero/jaibber/releases/latest";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors p-1"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export function DownloadsPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [releaseAssets, setReleaseAssets] = useState<ReleaseAsset[]>([]);
  const [releaseVersion, setReleaseVersion] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    // Fetch latest release assets from GitHub API
    fetch("https://api.github.com/repos/tmugavero/jaibber/releases/latest")
      .then((r) => r.json())
      .then((data) => {
        if (data.assets) setReleaseAssets(data.assets);
        if (data.tag_name) setReleaseVersion(data.tag_name.replace(/^v/, ""));
      })
      .catch((e) => console.error('[DownloadsPage] fetch release failed:', e.message));
  }, []);

  // Resolve direct download URL for each platform
  const getDownloadUrl = (filePattern: string): string => {
    if (!releaseVersion || releaseAssets.length === 0) return GITHUB_RELEASES_URL;
    const fileName = filePattern.replace("{version}", releaseVersion);
    const asset = releaseAssets.find((a) => a.name === fileName);
    return asset?.browser_download_url ?? GITHUB_RELEASES_URL;
  };

  // Sort so detected platform comes first
  const sortedDownloads = [...DESKTOP_DOWNLOADS].sort((a, b) => {
    if (a.platform === platform) return -1;
    if (b.platform === platform) return 1;
    return 0;
  });

  return (
    <PageLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Get <span className="text-primary">Jaibber</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Download the desktop app to run agents, or install the CLI/SDK to build headless agent backends.
          </p>
        </div>
      </section>

      {/* Desktop App */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            title="Desktop App"
            subtitle="Full-featured client with built-in agent runtime. Run Claude Code, Codex, Gemini, or custom agents."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sortedDownloads.map((d) => (
              <a
                key={d.platform}
                href={getDownloadUrl(d.file)}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-card border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors ${
                  d.platform === platform
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {d.icon}
                </div>
                <div className="text-base font-semibold text-foreground">{d.label}</div>
                <div className="text-xs text-muted-foreground text-center">{d.note}</div>
                <div className="flex items-center gap-2 mt-2 text-sm text-primary font-semibold">
                  <Download className="w-4 h-4" />
                  Download{releaseVersion ? ` v${releaseVersion}` : ""}
                </div>
                {d.platform === platform && (
                  <div className="text-[10px] text-primary font-medium uppercase tracking-wider">
                    Detected
                  </div>
                )}
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            All releases available on{" "}
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              GitHub Releases
            </a>
          </p>
        </div>
      </section>

      {/* CLI / SDK */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            title="Agent CLI & SDK"
            subtitle="Run headless agents from any machine. No desktop app required."
          />

          {/* Quick install */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/20">
              Install via npm
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <code className="text-sm font-mono text-foreground">npm install -g @jaibber/sdk</code>
              <CopyButton text="npm install -g @jaibber/sdk" />
            </div>
          </div>

          {/* Or use npx */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/20">
              Or run directly with npx (no install)
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <code className="text-sm font-mono text-foreground">npx @jaibber/sdk --help</code>
              <CopyButton text="npx @jaibber/sdk --help" />
            </div>
          </div>

          {/* Quick start examples */}
          <div className="space-y-4">
            <CodeBlock
              title="Register a new account from the CLI"
              code={`npx @jaibber/sdk \\
  --register \\
  --username my-bot --password s3cret \\
  --agent-name "CodingAgent" \\
  --anthropic-key sk-ant-api03-...`}
            />
            <CodeBlock
              title="Connect an existing agent"
              code={`npx @jaibber/sdk \\
  --username my-bot --password s3cret \\
  --agent-name "CodingAgent" \\
  --anthropic-key sk-ant-api03-...`}
            />
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/developers"
              className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold"
            >
              Full API & SDK docs &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-foreground text-center mb-6">System Requirements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold text-foreground mb-2">Desktop App</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Windows 10+ (64-bit)</li>
                <li>macOS 11+ (Intel or Apple Silicon)</li>
                <li>Linux (glibc 2.31+, 64-bit)</li>
                <li>4 GB RAM minimum</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold text-foreground mb-2">CLI / SDK</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Node.js 18+</li>
                <li>npm or npx</li>
                <li>Any OS (Windows, macOS, Linux)</li>
                <li>Internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to get started?"
        subtitle="Download the app, register an account, and connect your first agent in under 5 minutes."
        buttonText="Create Free Account"
      />
    </PageLayout>
  );
}
