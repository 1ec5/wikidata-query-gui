#Wikibase Query Service GUI

This repository contains the GUI for the [Wikidata Query Service](https://query.wikidata.org/).

Please see more details about the service in the [User Manual](https://www.mediawiki.org/wiki/Wikidata_query_service/User_Manual).


#Download & setup

Clone git repo, go into created folder and then pull all dependencies via npm package manager.

```bash
$ git clone https://gerrit.wikimedia.org/r/wikidata/query/gui
$ cd gui
$ npm install
```

Alternative use npm install

```bash
npm i wikidata-query-gui
```

#Run tests

Run JSHint, JSCS and QUnit tests.

```bash
$ grunt test
```

#Build
Create a build with bundled and minified files.

```bash
$ grunt build
```


#Deploy
Creates a build and pushes it to the deployment branch via git review

```bash
$ grunt deploy
```


Please make sure you have defined a gitreview username:
```bash
git config --global --add gitreview.username "[username]"
```


#Components
## Editor
A code mirror based SPARQL editor with code completion (ctrl+space) and tooltips
```
var editor = new wikibase.queryService.ui.editor.Editor();
editor.fromTextArea( $( '.editor' )[0] );
```
See examples/editor.html

## Example dialog

A dialog that allows browsing of SPARQL examples
```
new wikibase.queryService.ui.QueryExampleDialog(  $element, querySamplesApi, callback, previewUrl );
```
See examples/dialog.html

## SPARQL

```
var api = new wikibase.queryService.api.Sparql();
api.query( query ).done( function(){
	var json = JSON.parse( api.getResultAsJson() );

} );
```
See examples/sparql.html
## Result Views
Views that allow rendering SPARQL results [see documentation](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Wikidata_Query_Help/Result_Views).

```
var api = new wikibase.queryService.api.Sparql();
api.query( query ).done(function() {
	var result = new wikibase.queryService.ui.resultBrowser.CoordinateResultBrowser();
	result.setResult( api.getResultRawData() );
	result.draw( element );
} );


See examples/result.html
```





