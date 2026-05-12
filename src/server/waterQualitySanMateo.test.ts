import { describe, expect, it } from 'vitest';
import { parseSanMateoKML } from './waterQualitySanMateo';

// Minimal KML fixture mirroring the Google MyMaps output: top-level Style
// blocks reference icon-style URLs with the highlight color baked in, and
// each Placemark points to one via <styleUrl>.
const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Style id="icon-green">
      <IconStyle>
        <Icon>
          <href>https://mt.googleapis.com/vt/icon/name=icons/onion/1701-swimming.png&amp;highlight=ff000000,0F9D58</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="icon-red">
      <IconStyle>
        <Icon>
          <href>https://mt.googleapis.com/vt/icon/name=icons/onion/1701-swimming.png&amp;highlight=ff000000,A52714</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="icon-gray">
      <IconStyle>
        <Icon>
          <href>https://mt.googleapis.com/vt/icon/name=icons/onion/1701-swimming.png&amp;highlight=ff000000,757575</href>
        </Icon>
      </IconStyle>
    </Style>
    <Placemark>
      <name>SHARP PARK #3</name>
      <styleUrl>#icon-green</styleUrl>
      <Point><coordinates>-122.4945,37.6315,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>FITZGERALD MARINE RESERVE</name>
      <styleUrl>#icon-red</styleUrl>
      <Point><coordinates>-122.5178,37.5241,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>MONTARA BEACH</name>
      <styleUrl>#icon-gray</styleUrl>
      <Point><coordinates>-122.5137,37.5526,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>SURFER'S BEACH</name>
      <styleUrl>#icon-green</styleUrl>
      <Point><coordinates>-122.4686,37.4999,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;

describe('parseSanMateoKML', () => {
  it('extracts placemarks with the styleUrl color mapped to status', () => {
    const readings = parseSanMateoKML(SAMPLE_KML);
    expect(readings).toHaveLength(3); // gray (Not Sampled) is dropped
    const byName = Object.fromEntries(readings.map((r) => [r.beachName, r]));
    expect(byName['SHARP PARK #3'].status).toBe('open');
    expect(byName['FITZGERALD MARINE RESERVE'].status).toBe('caution');
    expect(byName["SURFER'S BEACH"].status).toBe('open');
  });

  it('maps Posted (A52714) to caution, not closed — surfers can still enter', () => {
    const readings = parseSanMateoKML(SAMPLE_KML);
    const fitz = readings.find((r) => r.beachName === 'FITZGERALD MARINE RESERVE');
    expect(fitz?.status).toBe('caution');
    expect(fitz?.rawStatus).toMatch(/advisory posted/i);
  });

  it('drops Not Sampled (gray) placemarks rather than emitting a meaningless reading', () => {
    const readings = parseSanMateoKML(SAMPLE_KML);
    expect(readings.find((r) => r.beachName === 'MONTARA BEACH')).toBeUndefined();
  });

  it('stamps every reading with the San Mateo source and empty sampleDate', () => {
    const readings = parseSanMateoKML(SAMPLE_KML);
    for (const r of readings) {
      expect(r.source).toMatch(/San Mateo/);
      expect(r.sampleDate).toBe('');
    }
  });

  it('decodes XML entities in placemark names (SURFER&apos;S BEACH)', () => {
    const kml = SAMPLE_KML.replace("SURFER'S BEACH", 'SURFER&apos;S BEACH');
    const readings = parseSanMateoKML(kml);
    expect(readings.find((r) => r.beachName === "SURFER'S BEACH")).toBeDefined();
  });

  it('returns empty array on malformed input rather than throwing', () => {
    expect(parseSanMateoKML('not kml')).toEqual([]);
    expect(parseSanMateoKML('<kml></kml>')).toEqual([]);
  });
});
