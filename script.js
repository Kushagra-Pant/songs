const API_KEY = process.env.API_KEY;    
const USERNAME = 'blyattrosten';
const LIMIT = 200; // Max per page
const MIN_PLAYS = 4;
exceptions = {artist: [['Travi$ Scott', 'Travis Scott']]}

async function getAllTopTracks() {
    let page = 1;
    let totalPages = 1;
    let allTracks = [];

    while (page <= totalPages) {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${USERNAME}&api_key=${API_KEY}&format=json&period=overall&limit=${LIMIT}&page=${page}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            if (data.toptracks && data.toptracks.track) {
                const tracks = data.toptracks.track.filter(track => parseInt(track.playcount, 10) > MIN_PLAYS);
                allTracks = allTracks.concat(tracks);
            }

            totalPages = parseInt(data.toptracks['@attr'].totalPages, 10);
            page++;

        } catch (error) {
            console.error('Error fetching Last.fm data:', error);
            break;
        }
    }

    return allTracks;
}

const data = [] // {artist: "", songs: [{name: "", plays: 6}]}
async function loadData() {
    return fetch('non-spotify-data.txt')
      .then(response => response.text())
      .then(fileData  => {
        lines = fileData.split('\n');

        for(let i = 0; i < lines.length; i++){
            e = lines[i].split('\t')
            addSong(e[0], e[1], e[2])
        }
    });
}

async function addSong(artist, song, plays){
    let child = data.find(child => child.artist === artist);

    if (!child) {
        child = {
            artist: artist,
            songs: []
        };
        data.push(child);
    }

    child.songs.push({
        name: song,
        plays: parseInt(plays)
    });
}

async function main() {
    loadData()
    const rawData = await getAllTopTracks();
    console.log(rawData);
    
    for (let i = 0; i < rawData.length; i++) {
        for(j in exceptions['artist']){
            if (exceptions['artist'][j][0] === rawData[i]['artist']['name']){
                rawData[i]['artist']['name'] = exceptions['artist'][j][1]
            }
        }

        addSong(rawData[i]['artist']['name'], rawData[i]['name'], rawData[i]['playcount'])
    }
    console.log(data)
    getArtistData()
    visualizeData()
}

function getArtistData(){
    artists = []
    songs = []
    for(i in data){
        s = {name: data[i]['artist'], id: data[i]['artist'], data: []}
        sum = 0
        for(song in data[i]['songs']){
            sum += parseInt(data[i]['songs'][song]['plays'])
            s['data'].push([data[i]['songs'][song]['name'], data[i]['songs'][song]['plays']])
        }
        artists.push({name: data[i]['artist'], y: sum, drilldown: data[i]['artist']})
        songs.push(s)
    }
    artists.sort((a, b) => b.y - a.y);
    return {artists: artists, songs: songs}

}

function visualizeData() {
    chart = Highcharts.chart('chart', {
        chart: {
            type: 'bar',
            height: data.length * 40,
            events: {
                drilldown: function (event) {
                    console.log(event.seriesOptions.data.length)
                    chart.setSize(null, event.seriesOptions.data.length * 40 + 200)
                },
                drillup: function (event) {
                    chart.setSize(null, event.seriesOptions.data.length * 40)
                }
            }
        },
        title: {
            text: 'Browser market shares. January, 2022'
        },
        subtitle: {
            text: 'Click the columns to view versions. Source: <a href="http://statcounter.com" target="_blank">statcounter.com</a>'
        },
        accessibility: {
            announceNewData: {
                enabled: true
            }
        },
        xAxis: {
            type: 'category'
        },
        yAxis: {
            title: {
                text: 'Plays'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            series: {
                borderWidth: 0,
                dataLabels: {
                    enabled: true
                },
            },
            bar: {
                minPointLength: 20
            }
        },
    
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
            pointFormat: '<span style="color:{point.color}">{point.name}</span>: ' +
                '<b>{y}</b><br/>'
        },
    
        series: [
            {
                name: 'All',
                colorByPoint: true,
                drilldown: 'drilldown_series',
                data: getArtistData()['artists']
            }
        ],
        drilldown: {
            breadcrumbs: {
                position: {
                    align: 'right'
                }
            },
            series: getArtistData()['songs']
        }
    })
}

main()
