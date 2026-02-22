# tree
find . | grep -vE 'venv|migrations|requirements|__pycache__|db.sqlite' |xargs -I{} sh -c "echo '**'{}'**'; cat {}"
