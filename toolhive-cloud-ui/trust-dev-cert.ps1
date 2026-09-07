# trust-dev-cert.ps1
# 将本地 dev HTTPS 证书（certs/cert.pem）导入 Windows 受信任的根证书颁发机构，
# 消除浏览器访问 https://localhost:3000 时的证书警告。
#
# 注意：
#   1. 必须以管理员身份运行此脚本（修改本地计算机证书存储需要管理员权限）。
#   2. 该证书是自签 CA，仅用于本地开发，不要用于生产环境。
#   3. 导入后需重启浏览器（Edge/Chrome 使用系统证书存储）。
#
# 使用方法：
#   powershell -ExecutionPolicy Bypass -File .\trust-dev-cert.ps1

$ErrorActionPreference = "Stop"

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Host "[X] 需要以管理员身份运行此脚本。" -ForegroundColor Red
    Write-Host "    请在开始菜单搜索 'PowerShell' -> 右键'以管理员身份运行' -> 再执行本脚本。" -ForegroundColor Yellow
    exit 1
}

$certFile = Join-Path $PSScriptRoot "certs/cert.pem"
if (-not (Test-Path $certFile)) {
    Write-Host "[X] 未找到证书文件: $certFile" -ForegroundColor Red
    Write-Host "    请先运行 start-platform.ps1 生成证书，或检查 certs/ 目录。" -ForegroundColor Yellow
    exit 1
}

Write-Host "[*] 正在导入开发证书到本地计算机信任存储..." -ForegroundColor Cyan
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store(
    [System.Security.Cryptography.X509Certificates.StoreName]::Root,
    [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine
)
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)

try {
    $existing = $store.Certificates.Find(
        [System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,
        $cert.Thumbprint,
        $false
    )
    if ($existing.Count -gt 0) {
        Write-Host "[i] 证书已存在（Thumbprint: $($cert.Thumbprint)），跳过导入。" -ForegroundColor Gray
    } else {
        $store.Add($cert)
        Write-Host "[✓] 证书导入成功（Thumbprint: $($cert.Thumbprint)）。" -ForegroundColor Green
        Write-Host "    请重启浏览器后访问 https://localhost:3000。" -ForegroundColor Gray
    }
} finally {
    $store.Close()
}
