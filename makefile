heroku:
	git add .
	git commit -m 'heroku'
	heroku create
	git push heroku master
	heroku open

heroku-dell:
	heroku create
	git push heroku master
	heroku open