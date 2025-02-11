# NeverHack Monitor

## Overview

NeverHack Monitor is a system designed to monitor and process attack targets. This document provides an overview of the API endpoints and the database schema used in the system.

## API Endpoints

### Health Check
- **Endpoint:** `/health`
- **Method:** `GET`
- **Description:** Checks the health status of the API.
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2023-10-10T10:00:00.000Z",
    "version": "1.0.0"
  }
  ```

### Dashboard Statistics
- **Endpoint:** `/api/dashboard/stats`
- **Method:** `GET`
- **Description:** Retrieves overall statistics for the dashboard.
- **Response:**
  ```json
  {
    "total_targets": 100,
    "total_attacks": 500,
    "unique_hosts": 50,
    "unique_ips": 45
  }
  ```

### Attack Trends
- **Endpoint:** `/api/dashboard/trends`
- **Method:** `GET`
- **Description:** Retrieves attack trends over time.
- **Response:**
  ```json
  [
    {
      "time": "2023-10-10T10:00:00.000Z",
      "attacks": 10
    },
    {
      "time": "2023-10-10T11:00:00.000Z",
      "attacks": 15
    }
  ]
  ```

### Recent Targets
- **Endpoint:** `/api/dashboard/recent`
- **Method:** `GET`
- **Description:** Retrieves the most recent targets.
- **Response:**
  ```json
  [
    {
      "host": "example.com",
      "ip": "192.168.1.1",
      "type": "DDoS",
      "method": "GET",
      "port": 80,
      "path": "/api",
      "first_seen": "2023-10-10T10:00:00.000Z",
      "last_seen": "2023-10-10T11:00:00.000Z"
    }
  ]
  ```

### Attack Methods Distribution
- **Endpoint:** `/api/dashboard/methods`
- **Method:** `GET`
- **Description:** Retrieves the distribution of attack methods.
- **Response:**
  ```json
  {
    "GET": 50,
    "POST": 30,
    "PUT": 20
  }
  ```

### Search Targets
- **Endpoint:** `/api/search`
- **Method:** `GET`
- **Description:** Searches targets with filters.
- **Query Parameters:**
  - `query`: Search term (optional)
  - `method`: HTTP method filter (optional)
  - `days`: Look back period in days (default: 7)
  - `limit`: Maximum number of results (default: 50)
- **Response:**
  ```json
  [
    {
      "host": "example.com",
      "ip": "192.168.1.1",
      "type": "DDoS",
      "method": "GET",
      "port": 80,
      "path": "/api",
      "first_seen": "2023-10-10T10:00:00.000Z",
      "last_seen": "2023-10-10T11:00:00.000Z",
      "attacks": 5,
      "attack_stats": {
        "methods_used": ["GET", "POST"],
        "ports_targeted": [80, 443]
      }
    }
  ]
  ```

### Search Health Check
- **Endpoint:** `/api/search/health`
- **Method:** `GET`
- **Description:** Checks the health status of the search functionality.
- **Response:**
  ```json
  {
    "status": "ok",
    "total_records": 100,
    "timestamp": "2023-10-10T10:00:00.000Z"
  }
  ```

### Suggest Targets
- **Endpoint:** `/api/search/suggest`
- **Method:** `GET`
- **Description:** Provides search suggestions for hostnames.
- **Query Parameters:**
  - `q`: Search term (required)
- **Response:**
  ```json
  [
    "example.com",
    "example.net"
  ]
  ```

### Search Autocomplete
- **Endpoint:** `/api/search/autocomplete`
- **Method:** `GET`
- **Description:** Provides rich autocomplete suggestions including hosts, IPs, and paths.
- **Query Parameters:**
  - `q`: Search term (required)
- **Response:**
  ```json
  {
    "hosts": ["example.com"],
    "ips": ["192.168.1.1"],
    "paths": ["/api"]
  }
  ```

### Get Target Details
- **Endpoint:** `/api/search/target/{host}`
- **Method:** `GET`
- **Description:** Retrieves detailed information about a specific target.
- **Path Parameters:**
  - `host`: Hostname of the target (required)
- **Response:**
  ```json
  {
    "details": {
      "host": "example.com",
      "ip": "192.168.1.1",
      "type": "DDoS",
      "method": "GET",
      "port": 80,
      "path": "/api",
      "first_seen": "2023-10-10T10:00:00.000Z",
      "last_seen": "2023-10-10T11:00:00.000Z",
      "total_attacks": 5,
      "common_methods": {
        "GET": 3,
        "POST": 2
      },
      "port_distribution": {
        "80": 3,
        "443": 2
      }
    },
    "history": [
      {
        "time": "2023-10-10T10:00:00.000Z",
        "attacks": 3,
        "methods": ["GET"]
      },
      {
        "time": "2023-10-10T11:00:00.000Z",
        "attacks": 2,
        "methods": ["POST"]
      }
    ]
  }
  ```

### Watchlist

The watchlist API allows users to manage a list of hosts to monitor. It includes endpoints to add, retrieve, and delete watchlist items. When a host is added to the watchlist, the system checks if the host exists in the database and provides lightweight monitoring capabilities.

#### Get Watchlist
- **Endpoint:** `/watchlist`
- **Method:** `GET`
- **Description:** Retrieves all items in the watchlist.
- **Response:**
  ```json
  [
    {
      "id": 1,
      "pattern": "example.com",
      "description": "Example host",
      "severity": "high",
      "created_at": "2023-10-10T10:00:00.000Z",
      "last_match": "2023-10-10T11:00:00.000Z",
      "match_count": 5
    }
  ]
  ```

#### Add Watchlist Item
- **Endpoint:** `/watchlist`
- **Method:** `POST`
- **Description:** Adds a new item to the watchlist.
- **Request Body:**
  ```json
  {
    "pattern": "example.com",
    "description": "Example host",
    "severity": "high"
  }
  ```
- **Response:**
  ```json
  {
    "id": 1,
    "pattern": "example.com",
    "description": "Example host",
    "severity": "high",
    "created_at": "2023-10-10T10:00:00.000Z",
    "last_match": null,
    "match_count": 0
  }
  ```

#### Delete Watchlist Item
- **Endpoint:** `/watchlist/{item_id}`
- **Method:** `DELETE`
- **Description:** Deletes an item from the watchlist.
- **Path Parameters:**
  - `item_id`: ID of the watchlist item to delete (required)
- **Response:**
  ```json
  {
    "status": "success"
  }
  ```

## Database Schema

### TargetList Table
- **id**: Integer, Primary Key
- **filename**: String, Unique
- **ingested_at**: DateTime, Default to current UTC time
- **processed**: Boolean, Default to False
- **targets**: Relationship to `Target` table

### Target Table
- **id**: Integer, Primary Key
- **target_id**: String
- **request_id**: String
- **host**: String, Indexed
- **ip**: String, Indexed
- **type**: String
- **method**: String
- **port**: Integer
- **use_ssl**: Boolean, Default to False
- **path**: String
- **body**: JSON
- **headers**: JSON
- **first_seen**: DateTime, Default to current UTC time
- **last_seen**: DateTime, Default to current UTC time
- **target_list_id**: Integer, Foreign Key to `TargetList` table
- **target_list**: Relationship to `TargetList` table

### WatchlistItem Table
- **id**: Integer, Primary Key
- **pattern**: String, Not Null
- **description**: String
- **severity**: String (high, medium, low)
- **created_at**: DateTime, Default to current UTC time
- **last_match**: DateTime
- **match_count**: Integer, Default to 0

## Frontend Model

The frontend should be designed to interact with the above API endpoints and display the data retrieved from the database. Here are some key features to consider:

1. **Dashboard:**
   - Display overall statistics (total targets, total attacks, unique hosts, unique IPs).
   - Show attack trends over time.
   - List recent targets with details.

2. **Search Functionality:**
   - Provide a search bar to filter targets based on host, IP, path, and method.
   - Display search results with detailed information about each target.
   - Include autocomplete suggestions for search terms.

3. **Target Details:**
   - Show detailed information about a specific target, including attack history, common methods, and port distribution.

4. **WebSocket Integration:**
   - Use WebSocket to receive real-time updates on new targets and statistics.

5. **Health Checks:**
   - Display the health status of the API and search functionality.

6. **Watchlist Management:**
   - Allow users to add, view, and delete watchlist items.
   - Display the status of monitored hosts and alert users if a host is down.
