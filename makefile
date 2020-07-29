heroku:
	git add .
	git commit -m 'heroku'
	heroku create
	git push heroku master
	heroku open