# 部署脚本：构建 blog 前端并发布到 NAS（nginx-test 容器静态目录）
# 用法:
#   powershell -File scripts/deploy-nas.ps1                 # 构建 + 部署
#   powershell -File scripts/deploy-nas.ps1 -SkipBuild      # 仅部署现有 dist
# 认证:
#   - 优先使用 SSH 密钥（推荐：ssh-copy-id ljx@192.168.1.133 配置一次）
#   - 否则设置环境变量 SSH_PASSWORD
param(
    [switch]$SkipBuild,
    [string]$NasHost = "192.168.1.133",
    [string]$SshUser = "ljx",
    [string]$HtmlDir = "/volume1/docker/nginx-test/html",
    [string]$BackendDir = "/volume1/docker/zzz-hp-backend/app"
)
$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not $SkipBuild) {
    Write-Host "==> npm run build" -ForegroundColor Cyan
    Push-Location $ProjectRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
    Pop-Location
}

# ── SSH 认证准备 ──
$askpass = Join-Path $env:USERPROFILE ".ssh\askpass.cmd"
$tmpAskpass = $false
if (-not (Test-Path $askpass)) {
    if (-not $env:SSH_PASSWORD) {
        throw "没有可用认证：请先 ssh-copy-id $SshUser@$NasHost，或设置环境变量 SSH_PASSWORD"
    }
    $ascii = [Text.Encoding]::ASCII
    [IO.File]::WriteAllText($askpass, "@echo off`r`necho $($env:SSH_PASSWORD)`r`n", $ascii)
    $tmpAskpass = $true
}
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = "force"
$env:DISPLAY = "localhost:0"

function Invoke-Ssh([string]$RemoteCmd) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        ssh -o ConnectTimeout=15 $SshUser@$NasHost $RemoteCmd 2>&1
        if ($LASTEXITCODE -ne 0) { throw "ssh failed: $RemoteCmd" }
    } finally {
        $ErrorActionPreference = $prev
    }
}

# ── 打包上传（dist 与远端脚本均走 scp -O 二进制传输，避免换行符问题） ──
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tarball = Join-Path $env:TEMP "blog-dist-$stamp.tar.gz"
Write-Host "==> 打包 dist ($tarball)" -ForegroundColor Cyan
Push-Location (Join-Path $ProjectRoot "dist")
tar -czf $tarball .
Pop-Location

Write-Host "==> 上传到 NAS" -ForegroundColor Cyan
scp -O -q -o ConnectTimeout=15 $tarball "${SshUser}@${NasHost}:blog-dist.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp dist failed" }
scp -O -q -o ConnectTimeout=15 (Join-Path $PSScriptRoot "deploy-nas-remote.sh") "${SshUser}@${NasHost}:deploy-nas-remote.sh"
if ($LASTEXITCODE -ne 0) { throw "scp script failed" }

# ── 远端安装（备份旧版 → 解包 → 同步后端图片目录） ──
Write-Host "==> NAS 上安装" -ForegroundColor Cyan
$sudoPassLine = "Lai2254803"  # TODO: 改成从环境变量读取，避免明文
if ($env:SSH_PASSWORD) { $sudoPassLine = $env:SSH_PASSWORD }
$remoteCmd = "sudo -S -i bash /var/services/homes/$SshUser/deploy-nas-remote.sh " +
    "'$HtmlDir' '$BackendDir' '$stamp' /var/services/homes/$SshUser/blog-dist.tar.gz"
$out = "$sudoPassLine`n" | ssh -o ConnectTimeout=15 $SshUser@$NasHost $remoteCmd 2>&1
$remoteExit = $LASTEXITCODE
$ErrorActionPreference = "Continue"
if ($remoteExit -ne 0) { throw "远端安装失败 (exit=$remoteExit)" }
$out | ForEach-Object { Write-Host $_ }

# ── 验证 ──
Write-Host "==> 验证" -ForegroundColor Cyan
foreach ($probe in @(
        "http://127.0.0.1:15001/",
        "http://127.0.0.1:15001/zzz-assets/bg-collage.webp",
        "http://127.0.0.1:15001/api/zzz/calculator-buffs",
        "http://127.0.0.1:15001/character/soldier11.webp")) {
    $code = ssh -o ConnectTimeout=15 $SshUser@$NasHost "curl -s -m 8 -o /dev/null -w '%{http_code}' '$probe'" 2>&1
    Write-Host "  $code  $probe"
}
Write-Host "==> 完成。旧版本备份在 NAS: $HtmlDir.bak-$stamp（确认无误后可删除）" -ForegroundColor Green
if ($tmpAskpass) { Remove-Item $askpass -Force }