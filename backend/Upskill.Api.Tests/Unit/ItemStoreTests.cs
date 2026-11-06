using Upskill.Api.Demo;

namespace Upskill.Api.Tests.Unit;

public sealed class ItemStoreTests
{
    [Fact]
    public void Add_asigna_ids_correlativos_y_Find_los_recupera()
    {
        var store = new ItemStore();

        var a = store.Add("a");
        var b = store.Add("b");

        Assert.Equal((1, 2), (a.Id, b.Id));
        Assert.Equal(b, store.Find(2));
        Assert.Null(store.Find(99));
    }

    [Fact]
    public async Task Add_es_thread_safe()
    {
        var store = new ItemStore();

        await Task.WhenAll(Enumerable.Range(0, 1000).Select(i => Task.Run(() => store.Add($"item {i}"), TestContext.Current.CancellationToken)));

        Assert.Equal(1000, Enumerable.Range(1, 1000).Count(id => store.Find(id) is not null));
    }
}
