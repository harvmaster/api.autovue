# Bluez Paths and Objects
## Common Interfaces
> ### `org.freedesktop.DBus.Properties`
>> ### `Methods`
>>
>>  | Name                | Params | Example |
>>  | ------------------- |:-------:| --- |
>>  | Get       | ( `path`, `Property` ) | `myProps.Get('org.bluez.Adapter1.Discoverable')` | 
>>  | Set     | ( `path`, `Property`, `new Variant( 'type', value )`) | `myProps.Set('org.bluez.Adapter1', 'Discoverable', new Variant( 'b', true ) )` |
>>  | GetAll | (`path`) | `myProps.GetAll('org.bluez.Adapter1')` |
>
>> ### Events
>> | Name | CallBack |
>> | --- | --- |
>> | PropertiesChanged | `(Interface, Changes, Invalidated) => {  }` |
__________

> ### `org.bluez.Adapter1`
>> ### `Methods`
>>
>>  | Name                | Params | Example |
>>  | ------------------- |:-------:| --- |
>>  | StartDiscovery      | `()` | adapter.StartDiscovery() | 
>>  | StopDiscovery       | `()` | adapter.StopDiscovery()  |
>>  | SetDiscoveryFilter  | `Unsure` | `Unsure` |
>>  | GetDiscoveryFilters | `Unsure` | `Unsure` |
>>  | RemoveDevice        | `Unsure` | `Unsure` |
>> _______
>> ### `Properties`
>>  | Name                | Type | Access |
>>  | ------------------- |:-------:| --- |
>>  | Address      | `s` | `read` | 
>>  | AddressType       | `s` | `read`  |
>>  | Name  | `s` | `read` |
>>  | Alias | `s` | `readwrite` |
>>  | Class        | `u` | `read` |
>>  | Powered        | `b` | `readwrite` |
>>  | Discoverable        | `b` | `readwrite` |
>>  | DiscoverableTimeout        | `u` | `readwrite` |
>>  | Pairable        | `b` | `readwrite` |
>>  | PairableTimeout        | `u` | `readwrite` |
>>  | Discovering        | `b` | `read` |
>>  | UUIDs        | `as` | `read` |
>>  | Modalias        | `s` | `read` |
>>  | Roles        | `as` | `read` |
_____________________
> ### `org.bluez.Device1`
>> ### `Methods`
>>
>>  | Name                | Description | Params | Example |
>>  | ------------------- | --- |:-------:| --- |
>>  | Connect             |  Initiate Bluetooth connection with the device  |`()` | `device.Connect` | 
>>  | Disconnect          |  Disconnect from bluetooth device  |`()` | `device.Disconnect()`  |
>>  | ConnectProfile      |  unsure  |`Unsure` | `Unsure` |
>>  | DisconnectProfile   |  unsure  |`Unsure` | `Unsure` |
>>  | Pair                |  Initiate pairing with device  |`()` | `device.Pair()` |
>>  | CancelPairing       |  Cancel the pairing process  |`()` | `device.CancelPairing()` |
>
>> ### `Properties`
>>  | Name              | Type | Access |
>>  | ----------------- | ---- | --- |
>>  | Address           | `s`     | `read` | 
>>  | AddressType       | `s`     | `read`  |
>>  | Name              | `s`     | `read` |
>>  | Alias             | `s`     | `readwrite` |
>>  | Class             | `u`     | `read` |
>>  | Appearance        | `q`     | `read`  |
>>  | Icon              | `s`     | `read`  |
>>  | Paired            | `b`     | `read`  |
>>  | Trusted           | `b`     | `readwrite`  |
>>  | Blocked           | `b`     | `readwrite`  |
>>  | LegacyPairing     | `b`     | `read`  |
>>  | RSSI              | `n`     | `read`  |
>>  | Connected         | `b`     | `read`  |
>>  | UUIDs             | `as`    | `read`  |
>>  | Modalias          | `s`     | `read`  |
>>  | Adapter           | `o`     | `read`  |
>>  | ManufacturerData  | `a{qv}` | `read`  |
>>  | ServiceData       | `a{sv}` | `read`  |
>>  | TxPower           | `n`     | `read`  |
>>  | ServicesResolved  | `b`     | `read`  |
>>  | WakeAllowed       | `b`     | `readwrite`  |
__________________

## Proxy Buses
`/org/bluez`
> Interfaces
> __________________
> - /org/bluez/AgentManager1
>> `Methods`
>>
>>  | Name                | Params | Example |
>>  | ------------------- |:-------:| --- |
>>  | RegisterAgent       | ( `path`, `Agent` ) | `RegisterAgent('/test/agent', 'NoInputNoOutput')` | 
>>  | UnregsiterAgent     | ( `path`, `Agent` ) | `UnregisterAgent('/test/agent', 'NoInputNoOutput')` |
>>  | RequestDefaultAgent | `no idea` | 
> _______________
> - /org/bluez/ProfileManager1
> - /org/bluez/HealthManager1|
> ________________

`/org/bluez/hci0`
> Interfaces
>> ### `org.freedesktop/DBus.Introspectable`
>
>> ### `org.freedesktop.DBus.Properties`
>> [See Common Interfaces](#common-interfaces)
>
>> ### `org.bluez.Adapter1`
>> [See Common Interfaces](#org.bluez.Adapter1)
> - /org/bluez/GattManager1
> - /org/bluez/LEAdvertisingManager1
> - /org/bluez/Media1
> - /org/bluez/NetworkServer1

`/org/bluez/hci0/dev_xx_xx_xx_xx_xx`
> Interfaces
>> ### `orgfreedesktop.DBus.Introspectable`
>> [See Common Interfaces](#common-interfaces)
>
>> ### `org.freedesktop.DBus.Properties`
>> [See Common Interfaces](#common-interfaces)
>
>> ### `org.bluez.Device1`
>> [See Common Interfaces](#common-interfaces)
>
>> ### `org.bluez.Network1`
>
>> ### `org.bluez.MediaControl1`
