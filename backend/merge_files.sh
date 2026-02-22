tree
find . | grep -vE 'venv|migation|requirement' |xargs -I{} sh -c "echo '**'{}'**'; cat {}
