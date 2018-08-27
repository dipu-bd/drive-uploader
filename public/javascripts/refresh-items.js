function updateTable(elem) {
  if (!$('#table-body').length) return;
  $('#table-body').html(elem);
}

window.stopItem = function (itemUrl) {
  $.ajax({
    url: '/api/download/stop?url=' + encodeURIComponent(itemUrl),
  }).done(function (data) {
    if (data !== 'OK') alert(data);
  });
}

window.refreshItems = function () {
  $.ajax({
    url: '/api/downloads',
  }).done(function (data) {
    if (!data || !data.length) {
      updateTable(
        `<tr>
          <td colspan="10" style="text-align: center">
            <code style="color: grey">No files found</code>
          </td>
        </tr>`
      );
    } else {
      updateTable(
        `<tr>` + data.map(function (item) {
          var body = `<td title="${item.contentType}"><a href="${item.url}" target="_blank">${item.name}</a></td>`;
          if (item.finished && item.driveUrl) {
            body += `<td><a href="${item.driveUrl}" target="_blank">Open in Drive</a></td>`;
          } else {
            body += `<td>${item.status}</td>`;
          }
          body += `<td><button class="btn btn-sm" style="background: #ddd" onclick="stopItem('${item.url}')">Stop</button>`;
          return body;
        }) + `</tr>`
      );
    }
  });
}

var interval = null;
window.autoRefresh = function (evt) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  } else {
    interval = setInterval(() => {
      if (!$ || !$.ajax) return;
      window.refreshItems();
    }, 300);
  }
}
