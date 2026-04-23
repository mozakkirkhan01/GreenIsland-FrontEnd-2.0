# Trips Page Documentation

## Page Overview
The Trips page shows travel query records in a tab-driven, searchable table for agents/admin users. It is implemented as a standalone Angular component and uses Angular Material table controls for sorting, pagination, and filtering.

- Component TS: `src/app/agent/trips/trips.ts`
- Template: `src/app/agent/trips/trips.html`
- Styles: `src/app/agent/trips/trips.css`

## Route Configuration
Configured routes in `src/app/app.routes.ts`:

- `/admin/trips` -> `Trips` component (inside `AdminMaster` layout)
- `/agent/trips` -> `Trips` component (inside `AdminMaster` layout)

## Permissions and Menu Validation
On init, the component loads logged-in staff details and validates menu permissions.

Flow:
1. `staffLogin = localService.getEmployeeDetail()`
2. `validateMenu()` sends encrypted payload:
   - `{ Url: cleanUrl, StaffLoginId: staffLogin.StaffLoginId }`
3. `service.validiateMenu(...)` response is processed via `loadData.validiateMenu(...)`
4. Permissions update `action()` signal:
   - `CanCreate`
   - `CanEdit`
   - `CanDelete`
5. If `CanDelete` is true, a `delete` column is inserted into table columns.

## Data Source and API
The page data is loaded from QueryStepOne endpoints.

Primary load:
- Method: `loadTrips()`
- API wrapper: `service.getQueryStepOneList(obj)`
- Endpoint in `AppService`: `POST QueryStepOne/QueryStepOneList`
- Request payload sent (encrypted): `{}`

Other used APIs:
- Delete trip: `service.deleteQueryStepOne(obj)` -> `POST QueryStepOne/deleteQueryStepOne`
- Update status: `service.updateTripStatus(obj)` -> `POST QueryStepOne/updateTripStatus`

Success condition check:
- `response.Message === ConstantData.SuccessMessage`

## Trip Model Used By UI
The page maps API records into this UI model:

- `id`
- `agencyName`
- `contactName`
- `phone`
- `email`
- `destination`
- `date`
- `nights`
- `rooms`
- `assignee`
- `lastActivity`
- `tags`
- `status`
- `unread`
- `rawData`

## API-to-UI Transformation Rules
Transformation happens in `transformQueryToTrip(query)`.

### Field mapping
- `id` <- `QueryStepOneId`
- `agencyName` <- `AgencyName`
- `contactName` <- `ContactName`
- `phone` <- `Phone || ''`
- `email` <- `Email || ''`
- `destination` <- `DestinationName`
- `nights` <- `NoOfNights`
- `assignee` <- `AssigneeName || 'Unassigned'`
- `tags` <- `Tags || []`
- `rawData` <- original `query`

### Derived formatting
- `rooms` is derived from adults + parsed `ChildrenAges`
- `date` formatted from `StartDate` as `DD Mon YYYY` (en-US locale)
- `lastActivity` computed via `getTimeAgo(CreatedOn)`

### Status mapping
Numeric `TripStatus` to UI key:

- `1` -> `new`
- `2` -> `hold`
- `3` -> `converted`
- `4` -> `ontrip`
- `5` -> `past`
- `6` -> `canceled`
- `7` -> `dropped`
- fallback -> `new`

Status badge label/class is resolved through `STATUS_MAP`.

## UI Structure
Main sections in template:

1. Progress loader (`<app-progress>`) when `loading()` is true
2. Breadcrumb + page heading from `action().MenuTitle` and `action().ParentMenuTitle`
3. Header controls:
   - Search input
   - New Query button (visible only when `CanCreate`)
4. Left sidebar tabs with count badges
5. Main table with sticky header and row menu actions
6. Bottom paginator and result summary

## Filtering and Search
Filter is centrally applied through `applyFilter()` by serializing JSON into `dataSource.filter`:

- `tab` -> from `activeTab`
- `dest` -> from `filterDestination`
- `q` -> from `searchQuery`

Custom `filterPredicate` checks:
- Tab/status match (`all` bypasses)
- Destination exact match (when set)
- Text query match against:
  - Trip ID
  - Agency name
  - Contact name
  - Destination
  - Phone

## Tabs and Counts
Defined tab keys:
- `all`
- `new`
- `progress`
- `hold`
- `converted`
- `ontrip`
- `past`
- `canceled`
- `dropped`

Count logic:
- `getTabCount('all')` returns full list length
- Others count by exact `trip.status === key`

Note:
- Both `new` and `progress` tabs map to status value `1` for update operations, but loaded API status `1` is transformed to `new`. This means `progress` tab may remain empty unless status assignment logic is expanded.

## Row Actions
Available actions from row and context menu:

- View details: `openTripDetail(row)` -> navigate to `/agent/trips/:id`
- Edit trip: `editTrip(row)` -> navigate to `/agent/query-stepone/:id`
- Delete trip: `deleteTrip(row)` with confirmation and API call
- Create quote: `createQuote(row)` -> navigate to `/agent/trips/quote/:id`
- Update status: `updateStatus(row, statusKey)` -> numeric map -> `updateTripStatus(...)`

## Table Columns
Default displayed columns:
- `id`
- `contact`
- `details`
- `team`
- `tags`
- `status`
- `actions`

Conditional column:
- `delete` (only when `action().CanDelete` is true)

## Styling Notes
`trips.css` applies:
- Row hover highlight
- Header row shadow
- Paginator background adjustments
- Sidebar button hover effect
- Layout overrides using `:host ::ng-deep` for card/table stacking behavior

## Known Gaps / Integration Notes
Current routing table (`app.routes.ts`) defines:
- `/agent/trips`
- `/agent/query-stepone`

But the component navigates to additional dynamic routes:
- `/agent/trips/:id`
- `/agent/query-stepone/:id`
- `/agent/trips/quote/:id`

If these routes are not added elsewhere, those navigations will fail and should be implemented in route config.

## Quick Sequence (Runtime)
1. Page opens.
2. Staff info loaded from local storage service.
3. Menu permission validated.
4. Trips list fetched from QueryStepOne list API.
5. API rows transformed to `Trip` UI model.
6. Table rendered with tabs/search/pagination.
7. User actions (status/edit/delete/view) call route/API handlers.
