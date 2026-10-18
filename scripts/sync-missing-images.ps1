# 备案完成后执行：从生产站（zzz-hp.top）补齐缺失的运营图片到 NAS
# 缺图清单为 2026-10-18 全量扫描发现（git/后端/本地均无、Wayback 无存档）
# 用法:
#   powershell -File scripts/sync-missing-images.ps1 -NasHost 192.168.1.133
# 需要: 环境变量 SSH_PASSWORD（NAS sudo 密码）；zzz-hp.top 已恢复访问
param(
    [Parameter(Mandatory = $true)]
    [string]$NasHost,
    [string]$SshUser = "ljx",
    [string]$ProductionBase = "https://zzz-hp.top",
    [string]$BackendDir = "/volume1/docker/zzz-hp-backend/app",
    [string]$HtmlDir = "/volume1/docker/nginx-test/html"
)
$ErrorActionPreference = "Continue"

# ── 缺图清单（2026-10-18 扫描）──
$missing = @(
    "buff_image/3111.webp",                      # 摧心 (id 31101)
    "buff_image/1785858578190-enknrj.webp",      # 勠力 (id 31102)
    "buff_image/1785858587334-76mops.webp",      # 诡袭 (id 31103)
    "buff_image/31201.webp",                     # 破境 (id 31201)
    "buff_image/31102.webp",                     # 勠力 (id 31202)
    "buff_image/31203.webp",                     # 掣霜 (id 31203)
    "buff_image/31301.webp",                     # 摧心 (id 31301)
    "buff_image/31302.webp",                     # 冰袭 (id 31302)
    "buff_image/31303.webp",                     # 异变 (id 31303)
    "boss_image/1785940605959-mbeumh.webp"       # 蜕生·阿瓦鲁斯（防卫战 Boss）
)

$staging = Join-Path $env:TEMP "zzz-missing-imgs"
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "==> 从 $ProductionBase 下载 $($missing.Count) 张缺图" -ForegroundColor Cyan
$ok = 0
foreach ($rel in $missing) {
    $dst = Join-Path $staging $rel
    New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
    curl.exe -s -m 30 -o $dst -w "%{http_code}" "$ProductionBase/$rel" | Out-Null
    $size = (Get-Item $dst -ErrorAction SilentlyContinue).Length
    if ($size -gt 500) {
        Write-Host ("  OK   {0}  ({1} bytes)" -f $rel, $size)
        $ok++
    } else {
        Write-Host ("  FAIL {0}  (不可达或 404)" -f $rel) -ForegroundColor Yellow
        Remove-Item $dst -Force -ErrorAction SilentlyContinue
    }
}
if ($ok -eq 0) { throw "没有成功下载任何图片：确认 zzz-hp.top 已恢复访问" }
Write-Host "==> 成功 $ok / $($missing.Count)" -ForegroundColor Green

# ── SSH 认证 ──
$askpass = Join-Path $env:USERPROFILE ".ssh\askpass.cmd"
if (-not (Test-Path $askpass)) {
    if (-not $env:SSH_PASSWORD) { throw "请先设置环境变量 SSH_PASSWORD" }
    [IO.File]::WriteAllText($askpass, "@echo off`r`necho $($env:SSH_PASSWORD)`r`n", [Text.Encoding]::ASCII)
}
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = "force"
$env:DISPLAY = "localhost:0"

# ── 打包上传 ──
Push-Location $staging
tar -czf "$env:TEMP\zzz-missing-imgs.tar.gz" .
Pop-Location
scp -O -q -o ConnectTimeout=15 "$env:TEMP\zzz-missing-imgs.tar.gz" "${SshUser}@${NasHost}:zzz-missing-imgs.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }
scp -O -q -o ConnectTimeout=15 (Join-Path $PSScriptRoot "sync-missing-images-remote.sh") "${SshUser}@${NasHost}:sync-missing-images-remote.sh"
if ($LASTEXITCODE -ne 0) { throw "scp script failed" }

# ── 远端安装 ──
Write-Host "==> 安装到 NAS（后端目录 + 静态目录）" -ForegroundColor Cyan
$sudoPassLine = $env:SSH_PASSWORD
if (-not $sudoPassLine) { throw "请先设置环境变量 SSH_PASSWORD" }
$remoteCmd = "sudo -S -i bash /var/services/homes/$SshUser/sync-missing-images-remote.sh " +
    "'$BackendDir' '$HtmlDir' '/var/services/homes/$SshUser/zzz-missing-imgs.tar.gz'"
$out = "$sudoPassLine`n" | ssh -o ConnectTimeout=15 $SshUser@$NasHost $remoteCmd 2>&1
if ($LASTEXITCODE -ne 0) { throw "远端安装失败" }
$out | ForEach-Object { Write-Host $_ }

Remove-Item "$env:TEMP\zzz-missing-imgs.tar.gz" -Force -ErrorAction SilentlyContinue
Write-Host "==> 完成" -ForegroundColor Green