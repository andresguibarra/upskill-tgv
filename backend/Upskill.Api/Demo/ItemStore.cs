using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;

namespace Upskill.Api.Demo;

public sealed record Item(int Id, string Name);

public sealed record CreateItem([property: Required, StringLength(50, MinimumLength = 2)] string Name);

// Singleton thread-safe: varios requests en paralelo lo usan a la vez.
public sealed class ItemStore
{
    private readonly ConcurrentDictionary<int, Item> _items = new();
    private int _nextId;

    public Item? Find(int id) => _items.GetValueOrDefault(id);

    public Item Add(string name)
    {
        var item = new Item(Interlocked.Increment(ref _nextId), name);
        _items[item.Id] = item;
        return item;
    }
}
