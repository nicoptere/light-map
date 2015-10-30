

<?php
/*
$urls = [
    "http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Africa/N00E006.hgt.zip",
    "http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Africa/N00E009.hgt.zip",
    "http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Africa/N00E010.hgt.zip"
];

foreach($urls as $url)
{


    echo 'fecth: '.basename($url)."<br>";
    $new_filename = './downloads/'.basename($url);

    // or fopen can be file_get_contents: file_get_contents($url)

    file_put_contents($new_filename, fopen($url, 'r'));


    $zip = new ZipArchive;
    $res = $zip->open( $new_filename );
    if ($res === TRUE)
    {
      $zip->extractTo('./unzipped/');
      $zip->close();
      echo 'woot! '.$new_filename."<br>";
    } else {
      echo 'doh!';
    }


}
*/
    function loadNext( $stack )
    {

        $fruit = array_shift($stack);
        print_r($fruit);
        echo "<br>";

        if( $fruit == NULL )
        {
            echo "over";
        }
        else
        {
            print_r($stack);
            echo "<br>";
            loadNext( $stack );
        }

    }

    $stack = array("orange", "banana", "apple", "raspberry");
    loadNext( $stack );


?>