миграции: 

python manage.py makemigrations
python manage.py migrate - принять все миграции
python manage.py showmigrations - посмотреть какие миграции есть

запуск: 

python manage.py runserver
python manage.py shell - доступ к моделям
python manage.py check - проверить на ошибки в конфигах

админка:

python manage.py createsuperuser - доступ к админке
python manage.py seed_admin --email admin@test.local --password admin12345 --fullname "Test Admin" --company-id 1

другое: 

pip freeze > requirements.txt — сейв списка библиотек
pip install -r requirements.txt

установка: 

django-admin startproject core . - создать core django
python manage.py startapp <name> - создать модуль