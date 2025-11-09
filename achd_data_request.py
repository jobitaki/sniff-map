from ckanapi import RemoteCKAN
import datetime
import json
import time
import os

output_dir = "achd_updates"

rc = RemoteCKAN('https://data.wprdc.org/')

location_map = {
    "Fulton St. Fridge": (40.449895, -80.023159),
    "Harrison Township": (40.613864, -79.729569),
    "South Fayette": (40.375647, -80.169931),
    "Lawrenceville": (40.465433, -79.960742),
    "Liberty": (40.323856, -79.868064),
    "West Allegheny": (40.444747, -80.267303),
    "Avalon": (40.499789, -80.071347),
    "Lawrenceville 2": (40.465433, -79.960742),
    "Monroeville": (40.450117, -79.770961),
    "North Braddock": (40.402267, -79.860942),
    "Clairton": (40.294381, -79.885303),
    "Pittsburgh": (40.456383, -80.026417),
    "Lincoln": (40.308278, -79.869103),
    "Parkway East": (40.437431, -79.863572),
    "Natrona Lead": (40.618917, -79.719397),
    "Bridgeville": (40.362992, -80.102131),
    "Liberty 2": (40.323856, -79.868064),
    "Glassport High Street": (40.326019, -79.881747),
    "Flag Plaza": (40.443417, -79.990353),
    "Court House": (40.438369, -79.9968),
    "West Mifflin": (40.3629, -79.86506),
    "Liberty Trailer": (40.324736, -79.866448),
}

PARAM_MAP = {
    "PM10": "pm10",
    "PM10A": "pm10",
    "PM10B": "pm10",
    "PM10_640": "pm10",
    "PM10RAW": "pm10",
    "PM10_FL": "pm10",
    "PM25": "pm25",
    "PM25(2)": "pm25",
    "PM25B": "pm25",
    "PM25RAW": "pm25",
    "PM25T": "pm25",
    "PM25_FL": "pm25",
    "PM25_640": "pm25",
    "NOX": "n",
    "OUT_T": "tmp",
    "OUT_RH": "rh",
    "RH%": "rh",
}

def calculate_location_id(lat, lon):
    """
    Calculate a unique ID based on latitude and longitude using XOR
    Convert floats to integers by multiplying by 1000000 to preserve precision
    """
    lat_int = int(lat * 1000000)
    lon_int = int(lon * 1000000)
    return lat_int ^ lon_int

def get_hour_measurements(date, hour):
    print("Getting data for date "+str(date)+" hour "+str(hour))
    
    query_date = f"{date}T{hour:02d}:00:00"

    dt = datetime.datetime.fromisoformat(query_date).replace(tzinfo=datetime.timezone.utc)

    epoch_seconds = int(dt.timestamp())
   
    result = rc.action.datastore_search(
        resource_id="36fb4629-8003-4acc-a1ca-3302778a530d",
        filters={
            "is_valid": "True",
            "parameter": [
        "NOX",
        "PM10", "PM10A", "PM10B", "PM10_640", "PM10RAW", "PM10_FL",
        "PM25", "PM25(2)", "PM25B", "PM25RAW", "PM25T", "PM25_FL", "PM25_640",
        "OUT_T", "OUT_RH", "RH%",
    ],
            "datetime_est" : query_date
            
            },
        q = "2025"
    )

    # Build combined records per (site, query_date)
    combined_records = {}

    for r in result['records']:
        site = r.get("site")
        if site not in location_map:
            continue
        lat, lon = location_map[site]
        location_id = calculate_location_id(lat, lon)

        key = (site, query_date)

        if key not in combined_records:
            combined_records[key] = {
                "id": location_id,
                "t": epoch_seconds,
                "la": round(lat, 5),
                "lo": round(lon, 5),
                "pm1": -1,
                "pm25": -1,
                "pm10": -1,
                "p0p3": -1,
                "p0p5": -1,
                "p1": -1,
                "p2p5": -1,
                "p5": -1,
                "p10": -1,
                "v": -1,
                "n": -1,
                "c": -1,
                "tmp": -1,
                "rh": -1,
                "src": 0
            }
            print(combined_records[key])

        
        param = r.get("parameter")
        if param not in PARAM_MAP:
            continue

        field = PARAM_MAP[param]
        value = r.get("report_value")

        if value is not None:
            # Insert the fetched measurement in the proper field
            if field in ["pm10", "pm25", "tmp"]:
                combined_records[key][field] = round(float(value), 1)
            elif field in ["rh", "n"]:
                combined_records[key][field] = round(float(value), 2)

    return list(combined_records.values())

def write_json(records, filename):
    if not records:
        print("not records")
        return
    with open(output_dir + "/"+ filename, "a") as f:
        f.write("[")
        for r in records:
            json.dump(r,f, indent=4)
            f.write(",")
        f.write("]")
        print("Wrote to "+str(filename))

def collect_data():
    os.makedirs(output_dir, exist_ok=True)
    last_processed_file = os.path.join(output_dir, "last_processed.txt")

    now = datetime.datetime.now()

    # Load last processed time
    try:
        with open(last_processed_file, "r") as f:
            last_processed_str = f.read().strip()
            last_processed = datetime.datetime.fromisoformat(last_processed_str)
    except FileNotFoundError:
        # If no record exists, start from midnight today
        last_processed = datetime.datetime(now.year, now.month, now.day, 0)

    # Process all hours between last processed and current hour
    next_hour = last_processed + datetime.timedelta(hours=1)
    last_processed_hour = None
    
    while next_hour <= now:
        date_str = next_hour.strftime("%Y-%m-%d")
        hour = next_hour.hour
        data = get_hour_measurements(date_str, hour)
        if data:
            filename = f"achd_update_date_{date_str}_hour_{hour}.json"
            write_json(data, filename)
            last_processed_hour = (date_str, hour, filename)
            next_hour += datetime.timedelta(hours=1)
        else:
            print(f"No data for {date_str} hour {hour}")
            break
        
    # Save the last processed hour
    with open(last_processed_file, "w") as f:
        f.write((next_hour - datetime.timedelta(hours=1)).isoformat())
    
    # Delete all old files except the last processed hour
    if last_processed_hour:
        last_filename = last_processed_hour[2]
        print(f"\n🧹 Cleaning up old files (keeping only {last_filename})...")
        
        for filename in os.listdir(output_dir):
            filepath = os.path.join(output_dir, filename)
            # Skip the last processed file, the tracking file, and non-json files
            if filename == last_filename or filename == "last_processed.txt" or not filename.endswith(".json"):
                continue
            
            try:
                os.remove(filepath)
                print(f"   Deleted: {filename}")
            except Exception as e:
                print(f"   Error deleting {filename}: {e}")

if __name__ == "__main__":
    collect_data()
