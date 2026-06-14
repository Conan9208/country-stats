declare module 'tz-lookup' {
  /** Returns the IANA timezone name for the given latitude/longitude. */
  const tzlookup: (lat: number, lon: number) => string
  export default tzlookup
}
