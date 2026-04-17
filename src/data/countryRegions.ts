import type { Region } from '@/types/travel'

// 시차 또는 날씨가 지역별로 크게 다른 국가만 포함
export const COUNTRY_REGIONS: Record<string, Region[]> = {
  US: [
    { id: 'east',     label_ko: '동부 (뉴욕)',        label_en: 'East (New York)',          timezone: 'America/New_York',    representativeCity: 'New York' },
    { id: 'central',  label_ko: '중부 (시카고)',       label_en: 'Central (Chicago)',        timezone: 'America/Chicago',     representativeCity: 'Chicago' },
    { id: 'mountain', label_ko: '산악 (덴버)',         label_en: 'Mountain (Denver)',        timezone: 'America/Denver',      representativeCity: 'Denver' },
    { id: 'west',     label_ko: '서부 (LA)',           label_en: 'West (Los Angeles)',       timezone: 'America/Los_Angeles', representativeCity: 'Los Angeles' },
    { id: 'hawaii',   label_ko: '하와이',              label_en: 'Hawaii',                   timezone: 'Pacific/Honolulu',    representativeCity: 'Honolulu' },
    { id: 'alaska',   label_ko: '알래스카',            label_en: 'Alaska',                   timezone: 'America/Anchorage',   representativeCity: 'Anchorage' },
  ],
  JP: [
    { id: 'hokkaido', label_ko: '홋카이도 (삿포로)',   label_en: 'Hokkaido (Sapporo)',       timezone: 'Asia/Tokyo', representativeCity: 'Sapporo' },
    { id: 'kanto',    label_ko: '간토 (도쿄)',         label_en: 'Kanto (Tokyo)',            timezone: 'Asia/Tokyo', representativeCity: 'Tokyo' },
    { id: 'kansai',   label_ko: '간사이 (오사카)',     label_en: 'Kansai (Osaka)',           timezone: 'Asia/Tokyo', representativeCity: 'Osaka' },
    { id: 'kyushu',   label_ko: '규슈 (후쿠오카)',     label_en: 'Kyushu (Fukuoka)',         timezone: 'Asia/Tokyo', representativeCity: 'Fukuoka' },
    { id: 'okinawa',  label_ko: '오키나와',            label_en: 'Okinawa',                  timezone: 'Asia/Tokyo', representativeCity: 'Okinawa' },
  ],
  CN: [
    { id: 'beijing',   label_ko: '화북 (베이징)',      label_en: 'North (Beijing)',          timezone: 'Asia/Shanghai', representativeCity: 'Beijing' },
    { id: 'shanghai',  label_ko: '화동 (상하이)',      label_en: 'East (Shanghai)',          timezone: 'Asia/Shanghai', representativeCity: 'Shanghai' },
    { id: 'guangzhou', label_ko: '화남 (광저우)',      label_en: 'South (Guangzhou)',        timezone: 'Asia/Shanghai', representativeCity: 'Guangzhou' },
    { id: 'chengdu',   label_ko: '서남 (청두)',        label_en: 'Southwest (Chengdu)',      timezone: 'Asia/Shanghai', representativeCity: 'Chengdu' },
    { id: 'xinjiang',  label_ko: '신장 (우루무치)',    label_en: 'Xinjiang (Urumqi)',        timezone: 'Asia/Urumqi',   representativeCity: 'Urumqi' },
  ],
  CA: [
    { id: 'east',     label_ko: '동부 (토론토)',       label_en: 'East (Toronto)',           timezone: 'America/Toronto',   representativeCity: 'Toronto' },
    { id: 'central',  label_ko: '중부 (위니펙)',       label_en: 'Central (Winnipeg)',       timezone: 'America/Winnipeg',  representativeCity: 'Winnipeg' },
    { id: 'mountain', label_ko: '산악 (캘거리)',       label_en: 'Mountain (Calgary)',       timezone: 'America/Edmonton',  representativeCity: 'Calgary' },
    { id: 'west',     label_ko: '서부 (밴쿠버)',       label_en: 'West (Vancouver)',         timezone: 'America/Vancouver', representativeCity: 'Vancouver' },
  ],
  RU: [
    { id: 'moscow',        label_ko: '서부 (모스크바)',             label_en: 'West (Moscow)',                timezone: 'Europe/Moscow',        representativeCity: 'Moscow' },
    { id: 'yekaterinburg', label_ko: '우랄 (예카테린부르크)',       label_en: 'Ural (Yekaterinburg)',         timezone: 'Asia/Yekaterinburg',   representativeCity: 'Yekaterinburg' },
    { id: 'novosibirsk',   label_ko: '서시베리아 (노보시비르스크)', label_en: 'W.Siberia (Novosibirsk)',      timezone: 'Asia/Novosibirsk',     representativeCity: 'Novosibirsk' },
    { id: 'vladivostok',   label_ko: '극동 (블라디보스토크)',       label_en: 'Far East (Vladivostok)',       timezone: 'Asia/Vladivostok',     representativeCity: 'Vladivostok' },
  ],
  AU: [
    { id: 'sydney',   label_ko: '동부 (시드니)',        label_en: 'East (Sydney)',            timezone: 'Australia/Sydney',   representativeCity: 'Sydney' },
    { id: 'adelaide', label_ko: '중부 (애들레이드)',    label_en: 'Central (Adelaide)',       timezone: 'Australia/Adelaide', representativeCity: 'Adelaide' },
    { id: 'perth',    label_ko: '서부 (퍼스)',          label_en: 'West (Perth)',             timezone: 'Australia/Perth',    representativeCity: 'Perth' },
  ],
  BR: [
    { id: 'brasilia', label_ko: '브라질리아 (중부)',    label_en: 'Brasília (Central)',       timezone: 'America/Sao_Paulo',      representativeCity: 'Brasilia' },
    { id: 'manaus',   label_ko: '마나우스 (아마존)',    label_en: 'Manaus (Amazon)',          timezone: 'America/Manaus',         representativeCity: 'Manaus' },
    { id: 'fortaleza',label_ko: '포르탈레자 (북동부)',  label_en: 'Fortaleza (Northeast)',    timezone: 'America/Fortaleza',      representativeCity: 'Fortaleza' },
  ],
  MX: [
    { id: 'mexico_city', label_ko: '멕시코시티',        label_en: 'Mexico City',             timezone: 'America/Mexico_City', representativeCity: 'Mexico City' },
    { id: 'tijuana',     label_ko: '티후아나 (북서부)', label_en: 'Tijuana (Northwest)',     timezone: 'America/Tijuana',     representativeCity: 'Tijuana' },
  ],
  ID: [
    { id: 'jakarta',   label_ko: '자바 (자카르타)',     label_en: 'Java (Jakarta)',           timezone: 'Asia/Jakarta',    representativeCity: 'Jakarta' },
    { id: 'bali',      label_ko: '발리',               label_en: 'Bali',                     timezone: 'Asia/Makassar',   representativeCity: 'Bali' },
    { id: 'makassar',  label_ko: '술라웨시 (마카사르)', label_en: 'Sulawesi (Makassar)',      timezone: 'Asia/Makassar',   representativeCity: 'Makassar' },
    { id: 'jayapura',  label_ko: '파푸아 (자야푸라)',   label_en: 'Papua (Jayapura)',         timezone: 'Asia/Jayapura',   representativeCity: 'Jayapura' },
  ],
}
