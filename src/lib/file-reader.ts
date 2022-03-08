const readFile = (file: File) => {
  const extension = [...file.name.split('.')].pop();
  console.log({file,extension});
}

export {readFile}
