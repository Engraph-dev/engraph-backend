cd prisma
echo "Entering prisma submodule"
git status
git add . && npx git-cz
git push &

echo "Entering defs submodule"
cd ../
cd src/util/defs
git status
git add . && npx git-cz
git push &

cd ../../..

git add prisma
git add src/util/defs
read -p "Enter a commit message (default 'Update Submodules'): " COMMITMSG

if [[ -z $COMMITMSG ]]; then
	COMMITMSG="Update submodules";
fi

git commit -m "$COMMITMSG"