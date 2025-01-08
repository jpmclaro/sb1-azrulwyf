# Atualiza as referências do repositório remoto
git fetch origin main

# Obtém a lista de arquivos alterados e faz checkout de cada um
git diff --name-only origin/main | ForEach-Object {
    Write-Host "Baixando arquivo: $_" -ForegroundColor Green
    git checkout origin/main -- $_
}