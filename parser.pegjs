start
  = result:lookup {
      return result.trim().split('\n\n').map(function(p){ return '<p>' + p.trim().replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

markup
  = bold
  / italic
  / underline
  / wiki_link
  / cute_link
  / just_link
  / inches

lookup
  = a:markup b:lookup { return a + b; }
  / a:. b:lookup { return a + b; }
  / { return ''; }

inches
  = '"' a:inches_end { return '«' + a + '»'; }
inches_end
  = '"' { return ''; }
  / a:. b:inches_end { return a + b; }

just_link
  = '[[' url:just_url ']]' { return '<a href=\'' + url + '\'>' + url + '</a>'; }
just_url
  = a:. b:just_url_end { return a + b; }
just_url_end
  = &']]'
  / a:. b:just_url_end { return a + b; }

cute_link
  = '[[' url:url ' ' char:. anchor:cute_link_end { return '<a href=\'' + url + '\'>' + char + anchor + '</a>'; }
cute_link_end
  = ']]' { return ''; }
  / a:. b:cute_link_end { return a + b; }
url
  = a:. b:url_end { return a + b; }
url_end
  = &' '
  / a:. b:url_end { return a + b; }

wiki_link
  = '[[' url:wiki_url ' ' char:. anchor:wiki_link_end {
      return '<a href=\'#' + url + '\' class=\'--parser-wiki-link\'>' + char + anchor + '</a>';
  }
wiki_link_end
  = ']]' { return ''; }
  / a:. b:wiki_link_end { return a + b; }
wiki_url
  = a:wiki_url_char+ b:('/' wiki_url)? { return a.join('') + (b ? Array.prototype.join.call(b, '') : ''); }
wiki_url_char
  = x:. & { return /[a-z0-9_]/.test(x); } { return x; }

bold
  = '**' char:. end:end_bold { return '<b>' + char + end + '</b>'; }
end_bold
  = '**' { return ''; }
  / a:markup b:end_bold { return a + b; }
  / a:. b:end_bold { return a + b; }

italic
  = '//' char:. end:end_italic { return '<i>' + char + end + '</i>'; }
end_italic
  = '//' { return ''; }
  / a:markup b:end_italic { return a + b; }
  / a:. b:end_italic { return a + b; }

underline
  = '__' char:. end:end_underline { return '<u>' + char + end + '</u>'; }
end_underline
  = '__' { return ''; }
  / a:markup b:end_underline { return a + b; }
  / a:. b:end_underline { return a + b; }
